from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.core.logging import logger
from app.integrations.twilio_whatsapp import TwilioWhatsAppService
from app.services.ai_service import AIService
from app.services.transaction_service import TransactionService
from app.services.reminder_service import ReminderService
from app.services.report_service import ReportService
from app.repositories.user_repository import UserRepository
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.transaction import TransactionCreate
from app.schemas.reminder import ReminderCreate
from app.schemas.conversation import ConversationLogCreate
from app.models.conversation_log import MessageRole
from app.models.transaction import TransactionType
from app.utils.rate_limiter import whatsapp_rate_limiter
from decimal import Decimal

router = APIRouter(prefix="/webhook", tags=["Webhook"])


@router.post("/whatsapp")
async def whatsapp_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    MessageSid: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    try:
        from app.core.queue import enqueue_whatsapp_message
        
        twilio_service = TwilioWhatsAppService()
        phone_number = twilio_service.extract_phone_number(From)
        
        await whatsapp_rate_limiter.check_rate_limit(phone_number)
        
        logger.info(f"Received WhatsApp message from {phone_number}: {Body}")
        
        user_repo = UserRepository(db)
        user = await user_repo.get_by_phone(phone_number)
        
        if not user:
            response_message = """👋 Olá! Bem-vindo ao Assistente Financeiro!

Para começar a usar, você precisa se cadastrar no nosso site.

Após o cadastro, você poderá:
💰 Registrar despesas e receitas
📊 Ver relatórios financeiros
📅 Criar lembretes
💬 Conversar comigo via WhatsApp

Acesse: [URL_DO_SEU_SITE]"""
            
            await twilio_service.send_message(From, response_message)
            return {"status": "success", "message": "User not registered"}
        
        job_id = enqueue_whatsapp_message(
            user_id=user.id,
            phone_number=phone_number,
            message=Body,
            message_sid=MessageSid or ""
        )
        
        if job_id:
            logger.info(f"Enqueued message processing job {job_id} for user {user.id}")
            return {"status": "queued", "job_id": job_id}
        else:
            logger.error(f"Failed to enqueue message for user {user.id}")
            return {"status": "error", "message": "Failed to queue message"}
        
    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {str(e)}", exc_info=True)
        
        error_message = "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente."
        try:
            await twilio_service.send_message(From, error_message)
        except:
            pass
        
        return {"status": "error", "message": str(e)}


async def process_intent(
    intent: str,
    entities: dict,
    user_id: int,
    db: AsyncSession,
    ai_service: AIService,
    context: str
) -> str:
    try:
        if intent == "register_expense":
            return await handle_register_expense(user_id, entities, db, ai_service, context)
        
        elif intent == "register_income":
            return await handle_register_income(user_id, entities, db, ai_service, context)
        
        elif intent == "create_reminder":
            return await handle_create_reminder(user_id, entities, db, ai_service, context)
        
        elif intent == "financial_report":
            return await handle_financial_report(user_id, entities, db, ai_service, context)
        
        elif intent == "list_transactions":
            return await handle_list_transactions(user_id, entities, db, ai_service, context)
        
        else:
            return await handle_help(ai_service, context)
    
    except Exception as e:
        logger.error(f"Error processing intent {intent}: {str(e)}")
        return "Desculpe, não consegui processar sua solicitação. Pode tentar novamente?"


async def handle_register_expense(
    user_id: int,
    entities: dict,
    db: AsyncSession,
    ai_service: AIService,
    context: str
) -> str:
    try:
        amount = entities.get("amount")
        category = entities.get("category", "outros")
        description = entities.get("description", "")
        date_str = entities.get("date", datetime.now().strftime("%Y-%m-%d"))
        
        if not amount:
            return "Por favor, informe o valor da despesa. Exemplo: 'Gastei R$ 50 com almoço'"
        
        transaction_data = TransactionCreate(
            type=TransactionType.EXPENSE,
            amount=Decimal(str(amount)),
            category=category,
            description=description,
            date=datetime.strptime(date_str, "%Y-%m-%d").date()
        )
        
        transaction_service = TransactionService(db)
        transaction = await transaction_service.create_transaction(user_id, transaction_data)
        
        return f"""✅ Despesa registrada com sucesso!

💸 Valor: R$ {float(transaction.amount):.2f}
📁 Categoria: {transaction.category}
📅 Data: {transaction.date.strftime('%d/%m/%Y')}
{f'📝 Descrição: {transaction.description}' if transaction.description else ''}"""
    
    except Exception as e:
        logger.error(f"Error registering expense: {str(e)}")
        return "Erro ao registrar despesa. Verifique os dados e tente novamente."


async def handle_register_income(
    user_id: int,
    entities: dict,
    db: AsyncSession,
    ai_service: AIService,
    context: str
) -> str:
    try:
        amount = entities.get("amount")
        category = entities.get("category", "outros")
        description = entities.get("description", "")
        date_str = entities.get("date", datetime.now().strftime("%Y-%m-%d"))
        
        if not amount:
            return "Por favor, informe o valor da receita. Exemplo: 'Recebi R$ 3000 de salário'"
        
        transaction_data = TransactionCreate(
            type=TransactionType.INCOME,
            amount=Decimal(str(amount)),
            category=category,
            description=description,
            date=datetime.strptime(date_str, "%Y-%m-%d").date()
        )
        
        transaction_service = TransactionService(db)
        transaction = await transaction_service.create_transaction(user_id, transaction_data)
        
        return f"""✅ Receita registrada com sucesso!

💰 Valor: R$ {float(transaction.amount):.2f}
📁 Categoria: {transaction.category}
📅 Data: {transaction.date.strftime('%d/%m/%Y')}
{f'📝 Descrição: {transaction.description}' if transaction.description else ''}"""
    
    except Exception as e:
        logger.error(f"Error registering income: {str(e)}")
        return "Erro ao registrar receita. Verifique os dados e tente novamente."


async def handle_create_reminder(
    user_id: int,
    entities: dict,
    db: AsyncSession,
    ai_service: AIService,
    context: str
) -> str:
    try:
        title = entities.get("title")
        due_date_str = entities.get("due_date")
        
        if not title:
            return "Por favor, informe o que deseja lembrar. Exemplo: 'Lembrar de pagar conta amanhã'"
        
        if not due_date_str:
            due_date_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
        
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d %H:%M:%S")
        
        reminder_data = ReminderCreate(
            title=title,
            due_date=due_date
        )
        
        reminder_service = ReminderService(db)
        reminder = await reminder_service.create_reminder(user_id, reminder_data)
        
        return f"""✅ Lembrete criado com sucesso!

📌 {reminder.title}
📅 Data: {reminder.due_date.strftime('%d/%m/%Y às %H:%M')}"""
    
    except Exception as e:
        logger.error(f"Error creating reminder: {str(e)}")
        return "Erro ao criar lembrete. Tente novamente."


async def handle_financial_report(
    user_id: int,
    entities: dict,
    db: AsyncSession,
    ai_service: AIService,
    context: str
) -> str:
    try:
        report_service = ReportService(db)
        summary = await report_service.get_current_month_summary(user_id)
        
        return f"""📊 Resumo Financeiro - {summary['period']}

💰 Receitas: R$ {summary['total_income']:.2f}
💸 Despesas: R$ {summary['total_expenses']:.2f}
{'💚' if summary['balance'] >= 0 else '❤️'} Saldo: R$ {summary['balance']:.2f}

📈 Total de transações: {summary['transaction_count']}

Para ver mais detalhes, acesse o dashboard web!"""
    
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return "Erro ao gerar relatório. Tente novamente."


async def handle_list_transactions(
    user_id: int,
    entities: dict,
    db: AsyncSession,
    ai_service: AIService,
    context: str
) -> str:
    try:
        transaction_service = TransactionService(db)
        transactions = await transaction_service.get_user_transactions(user_id, limit=5)
        
        if not transactions:
            return "Você ainda não tem transações registradas."
        
        message = "📋 Últimas transações:\n\n"
        
        for t in transactions:
            emoji = "💸" if t.type == TransactionType.EXPENSE else "💰"
            message += f"{emoji} R$ {float(t.amount):.2f} - {t.category}\n"
            message += f"   {t.date.strftime('%d/%m/%Y')}\n\n"
        
        message += "Para ver todas as transações, acesse o dashboard web!"
        
        return message
    
    except Exception as e:
        logger.error(f"Error listing transactions: {str(e)}")
        return "Erro ao listar transações. Tente novamente."


async def handle_help(ai_service: AIService, context: str) -> str:
    return """👋 Como posso ajudar?

Você pode:

💰 Registrar despesas
Exemplo: "Gastei R$ 50 com almoço"

💵 Registrar receitas
Exemplo: "Recebi R$ 3000 de salário"

📊 Ver resumo financeiro
Exemplo: "Quanto gastei esse mês?"

📋 Ver transações
Exemplo: "Mostre minhas últimas transações"

📅 Criar lembretes
Exemplo: "Lembrar de pagar conta amanhã"

É só me enviar uma mensagem! 😊"""


from datetime import timedelta
