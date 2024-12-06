module.exports = {
    env: {
        node: true,
        es2021: true
    },
    extends: 'airbnb-base',
    parserOptions: {
        ecmaVersion: 'latest'
    },
    rules: {
        'indent': ['error', 4],
        'no-console': 'off'
    }
};
