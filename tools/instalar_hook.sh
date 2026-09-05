#!/bin/sh
# Instala (o reinstala) el hook de pre-commit que valida index.html. Ejecutar desde la raiz del repo.
cp tools/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit && echo "Hook instalado."
