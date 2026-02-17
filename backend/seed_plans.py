#!/usr/bin/env python
"""
Script para criar os planos iniciais no banco de dados
Execute: python seed_plans.py
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.plan import Plan
from app.core.logging import logger


async def seed_plans():
    async with AsyncSessionLocal() as db:
        try:
            plans_data = [
                {
                    "name": "Plano Gratuito",
                    "slug": "free",
                    "price": 0.00,
                    "currency": "BRL",
                    "billing_cycle": "monthly",
                    "features": {
                        "transactions": "20 por mês",
                        "whatsapp": "Sim",
                        "dashboard": "Sim",
                        "insights": "Básicos",
                        "support": "Email"
                    },
                    "transaction_limit": 20,
                    "is_active": True
                },
                {
                    "name": "Plano Pro",
                    "slug": "pro",
                    "price": 29.90,
                    "currency": "BRL",
                    "billing_cycle": "monthly",
                    "features": {
                        "transactions": "Ilimitadas",
                        "whatsapp": "Sim",
                        "dashboard": "Sim",
                        "insights": "Avançados",
                        "support": "Prioritário",
                        "export": "PDF",
                        "categories": "Personalizadas"
                    },
                    "transaction_limit": None,
                    "is_active": True
                }
            ]
            
            for plan_data in plans_data:
                plan = Plan(**plan_data)
                db.add(plan)
            
            await db.commit()
            logger.info("Plans seeded successfully!")
            print("✅ Planos criados com sucesso!")
            
        except Exception as e:
            logger.error(f"Error seeding plans: {str(e)}")
            print(f"❌ Erro ao criar planos: {str(e)}")
            await db.rollback()


if __name__ == "__main__":
    asyncio.run(seed_plans())
