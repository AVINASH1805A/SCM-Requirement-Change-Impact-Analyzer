"""
Sample Enterprise Project Dataset for Requirement Change Impact Analyzer.
Project: SmartShop E-Commerce & Customer Identity Platform
"""

SAMPLE_REQUIREMENTS = [
    {
        "id": "REQ-101",
        "title": "User Authentication & Sign-in",
        "category": "Security & Identity",
        "priority": "HIGH",
        "status": "APPROVED",
        "description": "User sign-in using email address and password credentials.",
        "version": "1.0",
        "author": "Alice (Product Manager)"
    },
    {
        "id": "REQ-102",
        "title": "Two-Factor Authentication (OTP)",
        "category": "Security & Identity",
        "priority": "HIGH",
        "status": "PROPOSED",
        "description": "Optional SMS/Email One-Time Password verification upon user sign-in.",
        "version": "1.1",
        "author": "Bob (Security Lead)"
    },
    {
        "id": "REQ-103",
        "title": "Shopping Cart & Checkout Flow",
        "category": "E-Commerce Core",
        "priority": "CRITICAL",
        "status": "APPROVED",
        "description": "Allows registered users to add items to cart, calculate tax, and proceed to payment.",
        "version": "1.0",
        "author": "Charlie (PM)"
    },
    {
        "id": "REQ-104",
        "title": "Stripe & Credit Card Payment Gateway Integration",
        "category": "Payments",
        "priority": "CRITICAL",
        "status": "APPROVED",
        "description": "Processes online payment via Stripe API tokenization.",
        "version": "1.0",
        "author": "Dave (Tech Lead)"
    },
    {
        "id": "REQ-105",
        "title": "Order History & Invoice Generation",
        "category": "Orders",
        "priority": "MEDIUM",
        "status": "APPROVED",
        "description": "Generates PDF invoice and email confirmation upon completed purchase.",
        "version": "1.0",
        "author": "Alice (PM)"
    }
]

SAMPLE_ARTIFACTS = {
    # Requirements
    "REQ-101": {"id": "REQ-101", "name": "User Auth & Sign-in", "type": "REQUIREMENT", "criticality": "HIGH"},
    "REQ-102": {"id": "REQ-102", "name": "Two-Factor Auth (OTP)", "type": "REQUIREMENT", "criticality": "HIGH"},
    "REQ-103": {"id": "REQ-103", "name": "Shopping Cart & Checkout", "type": "REQUIREMENT", "criticality": "CRITICAL"},
    "REQ-104": {"id": "REQ-104", "name": "Stripe Payment Gateway", "type": "REQUIREMENT", "criticality": "CRITICAL"},
    "REQ-105": {"id": "REQ-105", "name": "Order History & PDF Invoice", "type": "REQUIREMENT", "criticality": "MEDIUM"},

    # Architecture & Design Documents
    "ARCH-AUTH-01": {"id": "ARCH-AUTH-01", "name": "Auth Architecture Specification", "type": "DESIGN", "path": "docs/architecture/auth_design.md", "criticality": "HIGH"},
    "ARCH-CHECKOUT-02": {"id": "ARCH-CHECKOUT-02", "name": "Checkout Sequence Diagram", "type": "DESIGN", "path": "docs/architecture/checkout_flow.png", "criticality": "HIGH"},
    "ARCH-PAY-03": {"id": "ARCH-PAY-03", "name": "Payment Gateway API Spec", "type": "DESIGN", "path": "docs/architecture/payment_spec.md", "criticality": "CRITICAL"},

    # Source Code Components
    "CODE-AUTH-SERVICE": {"id": "CODE-AUTH-SERVICE", "name": "Auth Service Controller", "type": "CODE", "path": "backend/services/auth_service.py", "criticality": "HIGH"},
    "CODE-JWT-HANDLER": {"id": "CODE-JWT-HANDLER", "name": "JWT Token Generator", "type": "CODE", "path": "backend/utils/jwt_handler.py", "criticality": "HIGH"},
    "CODE-OTP-VERIFIER": {"id": "CODE-OTP-VERIFIER", "name": "OTP Token Verification Engine", "type": "CODE", "path": "backend/services/otp_verifier.py", "criticality": "HIGH"},
    "CODE-CART-SERVICE": {"id": "CODE-CART-SERVICE", "name": "Cart Service API", "type": "CODE", "path": "backend/services/cart_service.py", "criticality": "MEDIUM"},
    "CODE-PAYMENT-ADAPTER": {"id": "CODE-PAYMENT-ADAPTER", "name": "Stripe Payment Client Adapter", "type": "CODE", "path": "backend/services/stripe_adapter.py", "criticality": "CRITICAL"},
    "CODE-INVOICE-GEN": {"id": "CODE-INVOICE-GEN", "name": "PDF Invoice Generator", "type": "CODE", "path": "backend/services/invoice_generator.py", "criticality": "LOW"},

    # Database Tables & Schemas
    "DB-USERS": {"id": "DB-USERS", "name": "Users & Credentials Table", "type": "DATABASE", "path": "db/migrations/001_create_users.sql", "criticality": "CRITICAL"},
    "DB-OTP-TOKENS": {"id": "DB-OTP-TOKENS", "name": "OTP Verification Storage Table", "type": "DATABASE", "path": "db/migrations/002_create_otp_tokens.sql", "criticality": "HIGH"},
    "DB-ORDERS": {"id": "DB-ORDERS", "name": "Orders & Line Items Table", "type": "DATABASE", "path": "db/migrations/003_create_orders.sql", "criticality": "CRITICAL"},
    "DB-TRANSACTIONS": {"id": "DB-TRANSACTIONS", "name": "Payment Transactions Table", "type": "DATABASE", "path": "db/migrations/004_create_transactions.sql", "criticality": "CRITICAL"},

    # Test Cases & Test Suites (Full Regression Repository)
    "TEST-AUTH-UNIT": {"id": "TEST-AUTH-UNIT", "name": "Unit Tests: Auth Credentials & Passwords", "type": "TEST", "path": "tests/unit/test_auth_service.py", "criticality": "HIGH", "test_count": 45, "duration_sec": 12},
    "TEST-OTP-SUITE": {"id": "TEST-OTP-SUITE", "name": "Integration Tests: OTP Verification Flow", "type": "TEST", "path": "tests/integration/test_otp_flow.py", "criticality": "HIGH", "test_count": 30, "duration_sec": 28},
    "TEST-CHECKOUT-E2E": {"id": "TEST-CHECKOUT-E2E", "name": "E2E Tests: Cart & Checkout Pipeline", "type": "TEST", "path": "tests/e2e/test_checkout.py", "criticality": "CRITICAL", "test_count": 65, "duration_sec": 140},
    "TEST-PAYMENT-STRIPE": {"id": "TEST-PAYMENT-STRIPE", "name": "Integration Tests: Stripe Webhook & Payment", "type": "TEST", "path": "tests/integration/test_stripe.py", "criticality": "CRITICAL", "test_count": 50, "duration_sec": 95},
    "TEST-INVOICE-PDF": {"id": "TEST-INVOICE-PDF", "name": "Unit Tests: Invoice Formatting & Rendering", "type": "TEST", "path": "tests/unit/test_invoice.py", "criticality": "LOW", "test_count": 20, "duration_sec": 8},
    "TEST-CATALOG-SEARCH": {"id": "TEST-CATALOG-SEARCH", "name": "Integration Tests: Product Search & Filter", "type": "TEST", "path": "tests/integration/test_search.py", "criticality": "MEDIUM", "test_count": 80, "duration_sec": 45},
    "TEST-NOTIFICATION-EMAIL": {"id": "TEST-NOTIFICATION-EMAIL", "name": "Unit Tests: Email & SMS Notification Dispatcher", "type": "TEST", "path": "tests/unit/test_notifier.py", "criticality": "LOW", "test_count": 25, "duration_sec": 15},
    "TEST-SHIPPING-RATES": {"id": "TEST-SHIPPING-RATES", "name": "Unit Tests: Fedex & UPS Shipping Rate Calculator", "type": "TEST", "path": "tests/unit/test_shipping.py", "criticality": "MEDIUM", "test_count": 35, "duration_sec": 22},
    "TEST-USER-PROFILE": {"id": "TEST-USER-PROFILE", "name": "Unit Tests: User Profile & Address Book", "type": "TEST", "path": "tests/unit/test_profile.py", "criticality": "LOW", "test_count": 40, "duration_sec": 18},
    "TEST-SECURITY-AUDIT": {"id": "TEST-SECURITY-AUDIT", "name": "Security Tests: OWASP SQLi & XSS Scanner", "type": "TEST", "path": "tests/security/test_owasp.py", "criticality": "HIGH", "test_count": 55, "duration_sec": 60}
}

SAMPLE_TRACE_LINKS = [
    # REQ-101 (Auth)
    {"source": "REQ-101", "target": "ARCH-AUTH-01", "type": "SPECIFIED_BY"},
    {"source": "REQ-101", "target": "CODE-AUTH-SERVICE", "type": "IMPLEMENTED_BY"},
    {"source": "REQ-101", "target": "CODE-JWT-HANDLER", "type": "IMPLEMENTED_BY"},
    {"source": "REQ-101", "target": "DB-USERS", "type": "PERSISTED_IN"},
    {"source": "REQ-101", "target": "TEST-AUTH-UNIT", "type": "VERIFIED_BY"},

    # REQ-102 (OTP Auth extension)
    {"source": "REQ-102", "target": "REQ-101", "type": "EXTENDS"},
    {"source": "REQ-102", "target": "ARCH-AUTH-01", "type": "SPECIFIED_BY"},
    {"source": "REQ-102", "target": "CODE-AUTH-SERVICE", "type": "MODIFIES"},
    {"source": "REQ-102", "target": "CODE-OTP-VERIFIER", "type": "IMPLEMENTED_BY"},
    {"source": "REQ-102", "target": "DB-OTP-TOKENS", "type": "PERSISTED_IN"},
    {"source": "REQ-102", "target": "TEST-OTP-SUITE", "type": "VERIFIED_BY"},

    # REQ-103 (Cart)
    {"source": "REQ-103", "target": "REQ-101", "type": "REQUIRES_AUTH"},
    {"source": "REQ-103", "target": "ARCH-CHECKOUT-02", "type": "SPECIFIED_BY"},
    {"source": "REQ-103", "target": "CODE-CART-SERVICE", "type": "IMPLEMENTED_BY"},
    {"source": "REQ-103", "target": "DB-ORDERS", "type": "PERSISTED_IN"},
    {"source": "REQ-103", "target": "TEST-CHECKOUT-E2E", "type": "VERIFIED_BY"},

    # REQ-104 (Stripe Payments)
    {"source": "REQ-104", "target": "REQ-103", "type": "DEPENDS_ON"},
    {"source": "REQ-104", "target": "ARCH-PAY-03", "type": "SPECIFIED_BY"},
    {"source": "REQ-104", "target": "CODE-PAYMENT-ADAPTER", "type": "IMPLEMENTED_BY"},
    {"source": "REQ-104", "target": "DB-TRANSACTIONS", "type": "PERSISTED_IN"},
    {"source": "REQ-104", "target": "TEST-PAYMENT-STRIPE", "type": "VERIFIED_BY"},

    # REQ-105 (Invoice)
    {"source": "REQ-105", "target": "REQ-104", "type": "TRIGGERS_UPON"},
    {"source": "REQ-105", "target": "CODE-INVOICE-GEN", "type": "IMPLEMENTED_BY"},
    {"source": "REQ-105", "target": "TEST-INVOICE-PDF", "type": "VERIFIED_BY"}
]
