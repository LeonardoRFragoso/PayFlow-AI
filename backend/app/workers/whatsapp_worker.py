import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.integrations.twilio_whatsapp import TwilioWhatsAppService
from app.services.ai_service import AIService
from app.services.transaction_service import TransactionService
from app.services.reminder_service import ReminderService
from app.services.report_service import ReportService
from app.repositories.user_repository import UserRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.conversation_state_repository import ConversationStateRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.transaction import TransactionCreate
from app.schemas.reminder import ReminderCreate
from app.schemas.conversation import ConversationLogCreate
from app.models.conversation_log import MessageRole
from app.models.transaction import TransactionType
from app.core.logging import logger
from decimal import Decimal
from datetime import datetime, timedelta


async def process_message_async(user_id: int, phone_number: str, message: str, message_sid: str):
    async with AsyncSessionLocal() as db:
        try:
            twilio_service = TwilioWhatsAppService()
            
            subscription_repo = SubscriptionRepository(db)
            is_active = await subscription_repo.is_active(user_id)
            
            if not is_active:
                response = """⚠️ Sua assinatura está inativa.

Para continuar usando o Assistente Financeiro, acesse:
👉 https://seudominio.com/plans

Ou entre em contato conosco."""
                await twilio_service.send_message(f"whatsapp:{phone_number}", response)
                return
            
            conversation_repo = ConversationRepository(db)
            state_repo = ConversationStateRepository(db)
            
            await conversation_repo.create(
                user_id,
                ConversationLogCreate(message=message, role=MessageRole.USER)
            )
            
            state = await state_repo.get_or_create(user_id)
            context = await conversation_repo.get_context(user_id, limit=5)
            
            ai_service = AIService()
            
            if state.current_intent and state.pending_field:
                response_message = await handle_contextual_response(
                    user_id, message, state, db, ai_service, context
                )
            else:
                classification = await ai_service.classify_intent(message, context)
                intent = classification.get("intent")
                entities = classification.get("entities", {})
                
                response_message = await process_intent(
                    intent, entities, user_id, db, ai_service, context, state_repo
                )
            
            await conversation_repo.create(
                user_id,
                ConversationLogCreate(message=response_message, role=MessageRole.ASSISTANT)
            )
            
            await twilio_service.send_message(f"whatsapp:{phone_number}", response_message)
            
            logger.info(f"Processed WhatsApp message for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error processing WhatsApp message: {str(e)}", exc_info=True)
            error_message = "Desculpe, ocorreu um erro. Tente novamente em instantes."
            try:
                await twilio_service.send_message(f"whatsapp:{phone_number}", error_message)
            except:
                pass


def process_whatsapp_message(user_id: int, phone_number: str, message: str, message_sid: str):
    asyncio.run(process_message_async(user_id, phone_number, message, message_sid))


async def handle_contextual_response(
    user_id: int,
    message: str,
    state,
    db: AsyncSession,
    ai_service: AIService,
    context: str
) -> str:
    state_repo = ConversationStateRepository(db)
    
    if state.current_intent == "register_expense" and state.pending_field == "category":
        context_data = state.context_data or {}
        amount = context_data.get("amount")
        
        if amount:
            transaction_data = TransactionCreate(
                type=TransactionType.EXPENSE,
                amount=Decimal(str(amount)),
                category=message.strip(),
                description=context_data.get("description", ""),
                date=datetime.now().date()
            )
            
            transaction_service = TransactionService(db)
            transaction = await transaction_service.create_transaction(user_id, transaction_data)
            
            await state_repo.clear_state(user_id)
            
            return f"""✅ Despesa registrada!

💸 Valor: R$ {float(transaction.amount):.2f}
📁 Categoria: {transaction.category}
📅 Data: {transaction.date.strftime('%d/%m/%Y')}"""
    
    elif state.current_intent == "register_income" and state.pending_field == "category":
        context_data = state.context_data or {}
        amount = context_data.get("amount")
        
        if amount:
            transaction_data = TransactionCreate(
                type=TransactionType.INCOME,
                amount=Decimal(str(amount)),
                category=message.strip(),
                description=context_data.get("description", ""),
                date=datetime.now().date()
            )
            
            transaction_service = TransactionService(db)
            transaction = await transaction_service.create_transaction(user_id, transaction_data)
            
            await state_repo.clear_state(user_id)
            
            return f"""✅ Receita registrada!

💰 Valor: R$ {float(transaction.amount):.2f}
📁 Categoria: {transaction.category}
📅 Data: {transaction.date.strftime('%d/%m/%Y')}"""
    
    await state_repo.clear_state(user_id)
    return "Desculpe, não entendi. Vamos começar de novo. Como posso ajudar?"


async def process_intent(
    intent: str,
    entities: dict,
    user_id: int,
    db: AsyncSession,
    ai_service: AIService,
    context: str,
    state_repo: ConversationStateRepository
) -> str:
    try:
        if intent == "register_expense":
            amount = entities.get("amount")
            
            if not amount:
                return "Por favor, informe o valor da despesa. Exemplo: 'Gastei R$ 50'"
            
            category = entities.get("category")
            
            if not category or category == "outros":
                await state_repo.update_state(
                    user_id,
                    current_intent="register_expense",
                    pending_field="category",
                    context_data={"amount": amount, "description": entities.get("description", "")}
                )
                return """Qual a categoria dessa despesa?

Exemplos: alimentação, transporte, saúde, lazer, moradia"""
            
            transaction_data = TransactionCreate(
                type=TransactionType.EXPENSE,
                amount=Decimal(str(amount)),
                category=category,
                description=entities.get("description", ""),
                date=datetime.strptime(entities.get("date", datetime.now().strftime("%Y-%m-%d")), "%Y-%m-%d").date()
            )
            
            transaction_service = TransactionService(db)
            transaction = await transaction_service.create_transaction(user_id, transaction_data)
            
            return f"""✅ Despesa registrada!

💸 Valor: R$ {float(transaction.amount):.2f}
📁 Categoria: {transaction.category}
📅 Data: {transaction.date.strftime('%d/%m/%Y')}"""
        
        elif intent == "register_income":
            amount = entities.get("amount")
            
            if not amount:
                return "Por favor, informe o valor da receita. Exemplo: 'Recebi R$ 3000'"
            
            category = entities.get("category", "outros")
            
            transaction_data = TransactionCreate(
                type=TransactionType.INCOME,
                amount=Decimal(str(amount)),
                category=category,
                description=entities.get("description", ""),
                date=datetime.strptime(entities.get("date", datetime.now().strftime("%Y-%m-%d")), "%Y-%m-%d").date()
            )
            
            transaction_service = TransactionService(db)
            transaction = await transaction_service.create_transaction(user_id, transaction_data)
            
            return f"""✅ Receita registrada!

💰 Valor: R$ {float(transaction.amount):.2f}
📁 Categoria: {transaction.category}
📅 Data: {transaction.date.strftime('%d/%m/%Y')}"""
        
        elif intent == "create_reminder":
            title = entities.get("title")
            due_date_str = entities.get("due_date")
            
            if not title:
                return "Por favor, me diga o que deseja lembrar. Exemplo: 'Lembrar de pagar conta amanhã'"
            
            if not due_date_str:
                due_date_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
            
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d %H:%M:%S")
            
            reminder_data = ReminderCreate(title=title, due_date=due_date)
            
            reminder_service = ReminderService(db)
            reminder = await reminder_service.create_reminder(user_id, reminder_data)
            
            return f"""✅ Lembrete criado!

📌 {reminder.title}
📅 {reminder.due_date.strftime('%d/%m/%Y às %H:%M')}"""
        
        elif intent == "financial_report":
            report_service = ReportService(db)
            summary = await report_service.get_current_month_summary(user_id)
            
            return f"""📊 Resumo Financeiro - {summary['period']}

💰 Receitas: R$ {summary['total_income']:.2f}
💸 Despesas: R$ {summary['total_expenses']:.2f}
{'💚' if summary['balance'] >= 0 else '❤️'} Saldo: R$ {summary['balance']:.2f}

📈 Transações: {summary['transaction_count']}

Acesse o dashboard para mais detalhes!"""
        
        elif intent == "list_transactions":
            transaction_service = TransactionService(db)
            transactions = await transaction_service.get_user_transactions(user_id, limit=5)
            
            if not transactions:
                return "Você ainda não tem transações registradas."
            
            message = "📋 Últimas transações:\n\n"
            for t in transactions:
                emoji = "💸" if t.type == TransactionType.EXPENSE else "💰"
                message += f"{emoji} R$ {float(t.amount):.2f} - {t.category}\n"
                message += f"   {t.date.strftime('%d/%m/%Y')}\n\n"
            
            return message
        
        else:
            return """👋 Como posso ajudar?

💰 Registrar despesas
💵 Registrar receitas
📊 Ver resumo financeiro
📋 Ver transações
📅 Criar lembretes

É só me enviar uma mensagem! 😊"""
    
    except Exception as e:
        logger.error(f"Error processing intent {intent}: {str(e)}")
        return "Desculpe, não consegui processar. Pode tentar novamente?"
