# FluxSis

Plataforma de vendas, gestão e delivery para pequenos negócios locais
(adegas, lanchonetes, confeitarias, restaurantes) via WhatsApp.

Ver /docs para arquitetura, fluxos e decisões técnicas.

## Estrutura

- apps/admin-web — painel administrativo (adega + super admin)
- apps/entregador-pwa — PWA do entregador
- apps/api — funções de backend (webhooks, regras de negócio)
- apps/whatsapp-bot — lógica do chatbot (regras + IA de apoio)
- supabase/migrations — schema do banco versionado
- docs — documentação do projeto
