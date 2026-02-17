from openai import AsyncOpenAI
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import re
from app.core.config import settings
from app.core.logging import logger


class AIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
    
    async def classify_intent(self, message: str, context: str = "") -> Dict[str, Any]:
        system_prompt = """Você é um assistente financeiro inteligente via WhatsApp.
Sua função é classificar a intenção do usuário e extrair informações relevantes.

INTENTS POSSÍVEIS:
- register_expense: Usuário quer registrar uma despesa
- register_income: Usuário quer registrar uma receita
- create_reminder: Usuário quer criar um lembrete/compromisso
- financial_report: Usuário quer ver relatórios, saldo, resumo financeiro
- list_transactions: Usuário quer ver lista de transações
- help: Usuário precisa de ajuda ou não entendeu

EXTRAÇÃO DE ENTIDADES:
Para despesas/receitas, extraia:
- amount (valor numérico)
- category (categoria como: alimentação, transporte, saúde, lazer, salário, freelance, etc)
- description (descrição opcional)
- date (data no formato YYYY-MM-DD, se não especificada use hoje)

Para lembretes, extraia:
- title (título do lembrete)
- due_date (data e hora no formato YYYY-MM-DD HH:MM:SS)

Para relatórios, extraia:
- period (hoje, semana, mês, ano, ou datas específicas)
- start_date e end_date se especificado

IMPORTANTE:
- Entenda português informal e gírias
- Valores podem estar como "50 reais", "R$ 50", "cinquenta reais"
- Datas podem ser "hoje", "amanhã", "segunda", "próxima semana"
- Seja tolerante com erros de digitação

Responda APENAS com JSON válido no formato:
{
    "intent": "nome_do_intent",
    "confidence": 0.95,
    "entities": {
        "campo1": "valor1",
        "campo2": "valor2"
    },
    "response_suggestion": "Sugestão de resposta amigável para o usuário"
}"""

        user_prompt = f"""Contexto da conversa:
{context if context else "Nenhum contexto anterior"}

Mensagem atual do usuário:
{message}

Classifique a intenção e extraia as entidades."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"AI Classification: {result['intent']} (confidence: {result.get('confidence', 0)})")
            return result
            
        except Exception as e:
            logger.error(f"Error in AI classification: {str(e)}")
            return {
                "intent": "help",
                "confidence": 0.0,
                "entities": {},
                "response_suggestion": "Desculpe, não entendi. Pode reformular?"
            }
    
    async def generate_response(
        self, 
        intent: str, 
        entities: Dict[str, Any], 
        context: str = "",
        additional_data: Optional[Dict[str, Any]] = None
    ) -> str:
        system_prompt = """Você é um assistente financeiro amigável e profissional.
Gere respostas naturais, claras e objetivas em português brasileiro.
Use emojis quando apropriado para deixar a conversa mais amigável.
Seja conciso mas informativo."""

        user_prompt = f"""Intent: {intent}
Entidades extraídas: {json.dumps(entities, ensure_ascii=False)}
Dados adicionais: {json.dumps(additional_data or {}, ensure_ascii=False)}
Contexto: {context}

Gere uma resposta apropriada para o usuário."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente."
    
    async def extract_entities(self, message: str, intent: str) -> Dict[str, Any]:
        entities = {}
        message_lower = message.lower()
        
        if intent in ["register_expense", "register_income"]:
            amount = self._extract_amount(message)
            if amount:
                entities["amount"] = amount
            
            category = self._extract_category(message, intent)
            if category:
                entities["category"] = category
            
            entities["description"] = message[:200]
            entities["date"] = datetime.now().strftime("%Y-%m-%d")
        
        elif intent == "create_reminder":
            entities["title"] = message[:255]
            entities["due_date"] = self._extract_date(message)
        
        return entities
    
    def _extract_amount(self, text: str) -> Optional[float]:
        patterns = [
            r'R\$\s*(\d+(?:[.,]\d{2})?)',
            r'(\d+(?:[.,]\d{2})?)\s*reais?',
            r'(\d+(?:[.,]\d{2})?)\s*r\$',
            r'(\d+(?:[.,]\d{2})?)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(',', '.')
                try:
                    return float(amount_str)
                except ValueError:
                    continue
        return None
    
    def _extract_category(self, text: str, intent: str) -> str:
        text_lower = text.lower()
        
        expense_categories = {
            "alimentação": ["comida", "almoço", "jantar", "lanche", "restaurante", "mercado", "supermercado"],
            "transporte": ["uber", "taxi", "ônibus", "metrô", "gasolina", "combustível", "estacionamento"],
            "saúde": ["médico", "remédio", "farmácia", "hospital", "consulta", "exame"],
            "lazer": ["cinema", "show", "festa", "viagem", "diversão", "entretenimento"],
            "educação": ["curso", "livro", "escola", "faculdade", "aula"],
            "moradia": ["aluguel", "condomínio", "luz", "água", "internet", "gás"],
            "outros": []
        }
        
        income_categories = {
            "salário": ["salário", "salario", "pagamento", "ordenado"],
            "freelance": ["freela", "freelance", "bico", "extra"],
            "investimento": ["investimento", "rendimento", "dividendo", "juros"],
            "outros": []
        }
        
        categories = expense_categories if intent == "register_expense" else income_categories
        
        for category, keywords in categories.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return category
        
        return "outros"
    
    def _extract_date(self, text: str) -> str:
        text_lower = text.lower()
        now = datetime.now()
        
        if "hoje" in text_lower:
            return now.strftime("%Y-%m-%d %H:%M:%S")
        elif "amanhã" in text_lower or "amanha" in text_lower:
            tomorrow = datetime(now.year, now.month, now.day) + timedelta(days=1)
            return tomorrow.strftime("%Y-%m-%d 09:00:00")
        
        return (now + timedelta(days=1)).strftime("%Y-%m-%d 09:00:00")


from datetime import timedelta
