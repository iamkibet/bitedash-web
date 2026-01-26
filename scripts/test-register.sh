#!/usr/bin/env bash
# Test register API – run from project root in Terminal:
#   ./scripts/test-register.sh
# Or: bash scripts/test-register.sh

curl -X POST http://bitedash-api.test/api/v1/register \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+254712345678",
    "password": "Password123!",
    "password_confirmation": "Password123!",
    "role": "customer"
  }'
