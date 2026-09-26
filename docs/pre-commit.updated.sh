echo "Running Rising Edge pre-commit checks..."

# 1. Syntax check
echo "-> Node syntax check"
node --check server.js || { echo "FAIL: server.js has syntax errors"; exit 1; }
node --check lib/planUtils.js || { echo "FAIL: lib/planUtils.js has syntax errors"; exit 1; }

# 2. Lint
echo "-> ESLint"
node ./node_modules/eslint/bin/eslint.js server.js lib/ tests/ --ext .js,.cjs || { echo "FAIL: ESLint failed"; exit 1; }

# 3. Format staged files (auto-fix, then re-stage) so commits aren't blocked on style
echo "-> Prettier (auto-format staged files)"
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|cjs|html|css|json)$' || true)
if [ -n "$FILES" ]; then
  echo "$FILES" | xargs node ./node_modules/prettier/bin/prettier.cjs --write --ignore-path .prettierignore || { echo "FAIL: Prettier could not format some files"; exit 1; }
  echo "$FILES" | xargs git add
fi

# 4. Unit tests
echo "-> Unit tests"
node ./node_modules/jest/bin/jest.js --testPathPattern=tests/unit --forceExit --passWithNoTests || { echo "FAIL: Unit tests failed"; exit 1; }

# 5. API tests
echo "-> API tests"
node ./node_modules/jest/bin/jest.js --testPathPattern=tests/api --forceExit --passWithNoTests || { echo "FAIL: API tests failed"; exit 1; }

echo "All pre-commit checks passed"
