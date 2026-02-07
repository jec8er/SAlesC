# SAlesC
APpp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>SaborClick | Domicilios Premium</title>
    
    <!-- PWA & Mobile Config -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="theme-color" content="#ffffff">
    <link rel="apple-touch-icon" href="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=192">
    
    <!-- SEO -->
    <meta property="og:title" content="SaborClick | La App de Comida más Elegante">
    <meta property="og:description" content="Pide de los mejores restaurantes o crea tu tienda digital en segundos.">
    <meta property="og:image" content="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800">
    
    <!-- Dependencies -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #fafafa; color: #1f2937; -webkit-tap-highlight-color: transparent; }
        
        /* BRAND COLORS: Gourmet Orange */
        .text-brand { color: #FF5A1F; } 
        .bg-brand { background-color: #FF5A1F; }
        .hover-bg-brand:hover { background-color: #E04F1A; }
        .border-brand { border-color: #FF5A1F; }
        .bg-gradient-brand { background: linear-gradient(135deg, #FF5A1F 0%, #FF8C00 100%); }
        .bg-gradient-dark { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); }
        
        /* UI UTILITIES */
        .nav-item.active { color: #FF5A1F; font-weight: 700; }
        .nav-item.active i { fill: rgba(255, 90, 31, 0.1); stroke: #FF5A1F; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .modal-enter { animation: modalUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .bg-wa { background-color: #25D366; }
        .pb-safe { padding-bottom: calc(env(safe-area-inset-bottom) + 80px); }
        .fade-enter { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        /* Sticky Categories */
        .sticky-cats { position: sticky; top: 64px; z-index: 30; background: rgba(250, 250, 250, 0.95); backdrop-filter: blur(8px); }

        /* LEGAL STYLES */
        .legal-content h3 { font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #111827; }
        .legal-content p { margin-bottom: 0.75rem; color: #4b5563; font-size: 0.9rem; line-height: 1.5; }

        /* CAROUSEL ANIMATION */
        .snap-x-mandatory { scroll-snap-type: x mandatory; }
        .snap-center { scroll-snap-align: center; }
    </style>
</head>
<body class="text-gray-800 antialiased select-none pb-safe bg-gray-50 flex flex-col min-h-screen">

    <!-- Navbar -->
    <nav class="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all">
        <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3 cursor-pointer group" onclick="app.goHome()">
                <div class="bg-gradient-brand p-1.5 rounded-xl text-white shadow-lg shadow-orange-200 group-hover:scale-105 transition-transform"><i data-lucide="zap" class="w-5 h-5 fill-current"></i></div>
                <span class="text-xl font-extrabold tracking-tight text-gray-900 group-hover:text-brand transition-colors">SaborClick</span>
            </div>

            <!-- Desktop Search -->
            <div class="hidden md:flex flex-1 max-w-md mx-8 relative group">
                <input type="text" id="search-input" oninput="app.handleSearch(this.value)" placeholder="Buscar comida, restaurantes..." class="w-full bg-gray-100 border border-transparent rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand/20 focus:bg-white focus:border-brand/30 transition-all placeholder-gray-400">
                <i data-lucide="search" class="w-4 h-4 text-gray-400 absolute left-3 top-2.5 group-focus-within:text-brand transition-colors"></i>
            </div>

            <div class="flex items-center gap-3">
                <button onclick="app.goToMyBusiness()" class="hidden md:flex items-center gap-2 text-xs font-bold text-gray-600 bg-white hover:bg-orange-50 px-4 py-2 rounded-full transition-colors border border-gray-200 shadow-sm hover:border-orange-200 hover:text-brand">
                    <i data-lucide="store" class="w-3.5 h-3.5"></i> Vender
                </button>

                <button onclick="app.toggleCart()" class="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors group">
                    <i data-lucide="shopping-bag" class="w-5 h-5 text-gray-600 group-hover:text-brand transition-colors"></i>
                    <span id="cart-count" class="absolute top-0.5 right-0.5 bg-brand text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white transform scale-0 transition-transform shadow-sm">0</span>
                </button>

                <div id="desktop-auth" class="hidden md:block">
                    <button onclick="app.openModal('login')" id="login-btn-desk" class="bg-gray-900 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">Ingresar</button>
                    <div id="user-profile-desk" class="hidden relative group cursor-pointer ml-2">
                        <div class="w-9 h-9 bg-gradient-brand text-white rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-md user-initials">US</div>
                        <div class="absolute right-0 top-full mt-3 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 hidden group-hover:block overflow-hidden animate-in fade-in zoom-in-95 z-50">
                            <div class="p-4 border-b border-gray-50 bg-gray-50/50">
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cuenta</p>
                                <p class="font-bold text-gray-900 truncate user-name">Usuario</p>
                            </div>
                            <div class="p-2 space-y-1">
                                <button onclick="app.goToOrders()" class="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-brand rounded-xl flex items-center gap-2 transition-colors"><i data-lucide="package" class="w-4 h-4"></i> Pedidos</button>
                                <button onclick="app.goToMyBusiness()" class="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-brand rounded-xl flex items-center gap-2 transition-colors"><i data-lucide="store" class="w-4 h-4"></i> Mi Tienda</button>
                                <button onclick="app.exportData()" class="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center gap-2 transition-colors"><i data-lucide="download" class="w-4 h-4"></i> Backup</button>
                            </div>
                            <div class="border-t border-gray-100 p-2">
                                <button onclick="app.logout()" class="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors"><i data-lucide="log-out" class="w-4 h-4"></i> Salir</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- Toast -->
    <div id="toast" class="fixed top-24 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-full shadow-2xl z-[60] flex items-center gap-3 transition-all duration-300 opacity-0 pointer-events-none translate-y-[-10px]">
        <i data-lucide="check-circle" class="w-5 h-5 text-brand"></i>
        <span class="text-sm font-semibold" id="toast-msg">Listo</span>
    </div>

    <!-- Main Content -->
    <main id="main-container" class="flex-grow pb-safe px-0 md:px-0">
        <!-- Rendered by JS -->
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-100 py-10 mt-auto hidden md:block">
        <div class="max-w-7xl mx-auto px-4 flex justify-between items-start">
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <div class="bg-gray-100 p-1.5 rounded-lg"><i data-lucide="layers" class="w-4 h-4 text-gray-500"></i></div>
                    <span class="font-bold text-gray-900 text-sm">SaborClick Inc.</span>
                </div>
                <p class="text-xs text-gray-500 max-w-xs">Plataforma tecnológica de intermediación.<br>NIT: 900.XXX.XXX-X • Bogotá D.C., Colombia</p>
                <div class="flex items-center gap-2 mt-2 text-xs font-bold text-gray-400">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Colombia.svg" class="w-4 h-auto shadow-sm rounded-sm"> Colombia
                </div>
            </div>
            <div class="flex gap-12 text-sm text-gray-500 font-medium">
                <div class="flex flex-col gap-2">
                    <span class="font-bold text-gray-900 mb-1">Legal</span>
                    <button onclick="app.openLegal('terms')" class="text-left hover:text-brand">Términos y Condiciones</button>
                    <button onclick="app.openLegal('privacy')" class="text-left hover:text-brand">Política de Privacidad</button>
                    <button onclick="app.openLegal('retracto')" class="text-left hover:text-brand">Derecho de Retracto</button>
                </div>
                <div class="flex flex-col gap-2">
                    <span class="font-bold text-gray-900 mb-1">Soporte</span>
                    <button onclick="app.goToSupport()" class="text-left hover:text-brand">Centro de Ayuda</button>
                    <button onclick="window.open('mailto:pqr@saborclick.com')" class="text-left hover:text-brand">Radicar PQR</button>
                </div>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-50 text-center">
            <p class="text-xs text-gray-400">Vigilado por la Superintendencia de Industria y Comercio</p>
        </div>
    </footer>

    <!-- Cookie Banner -->
    <div id="cookie-banner" class="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[80] p-6 hidden flex-col md:flex-row items-center justify-between gap-4 safe-bottom">
        <div class="flex-1">
            <h4 class="font-bold text-gray-900 mb-1">Política de Cookies 🍪</h4>
            <p class="text-sm text-gray-500">Usamos cookies para mejorar tu experiencia y cumplir con la ley. <button onclick="app.openLegal('cookies')" class="text-brand font-bold underline">Ver detalles</button>.</p>
        </div>
        <div class="flex gap-3 w-full md:w-auto">
            <button onclick="app.acceptCookies()" class="flex-1 md:flex-none bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">Aceptar</button>
        </div>
    </div>

    <!-- Mobile Nav -->
    <div class="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-lg z-40 pb-safe-area safe-bottom">
        <div class="flex justify-around items-center h-16 px-1">
            <button onclick="app.navigate('home')" class="nav-item flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-900 transition-colors active" id="nav-home">
                <i data-lucide="home" class="w-6 h-6"></i> <span class="text-[10px] font-bold">Inicio</span>
            </button>
            <button onclick="app.goToMyBusiness()" class="nav-item flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-900 transition-colors" id="nav-biz">
                <i data-lucide="store" class="w-6 h-6"></i> <span class="text-[10px] font-bold">Vender</span>
            </button>
            <div class="relative -top-6">
                <button onclick="app.toggleCart()" class="w-14 h-14 bg-gradient-brand rounded-full flex items-center justify-center text-white shadow-xl shadow-orange-200 border-4 border-gray-50 transform active:scale-95 transition-all">
                    <i data-lucide="shopping-bag" class="w-6 h-6"></i>
                    <span id="nav-cart-count" class="absolute top-0 right-0 bg-gray-900 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white scale-0 transition-transform">0</span>
                </button>
            </div>
            <button onclick="app.navigate('orders')" class="nav-item flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-900 transition-colors" id="nav-orders">
                <i data-lucide="package" class="w-6 h-6"></i> <span class="text-[10px] font-bold">Pedidos</span>
            </button>
            <button onclick="app.navigate('profile')" class="nav-item flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-900 transition-colors" id="nav-profile">
                <i data-lucide="user" class="w-6 h-6"></i> <span class="text-[10px] font-bold">Perfil</span>
            </button>
        </div>
    </div>

    <!-- Cart Sidebar -->
    <div id="cart-sidebar" class="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl transform translate-x-full transition-transform duration-300 z-[60] flex flex-col border-l border-gray-100">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-sm">
            <h2 class="font-extrabold text-xl text-gray-900">Tu Pedido</h2>
            <button onclick="app.toggleCart()" class="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div id="cart-items" class="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50"></div>
        <div class="p-6 bg-white border-t border-gray-100 shadow-lg z-10 safe-bottom">
            <div class="space-y-3 mb-6">
                <div class="flex justify-between text-sm text-gray-500 font-medium"><span>Subtotal</span><span id="cart-subtotal" class="font-bold text-gray-900">$ 0</span></div>
                <div class="flex justify-between text-sm text-gray-500 font-medium"><span>Envío</span><span class="text-green-600 font-bold">GRATIS</span></div>
                <div class="flex justify-between text-sm text-brand font-bold bg-orange-50 p-2 rounded-lg"><span>Tarifa Servicio y Garantía</span><span id="cart-fee">$ 0</span></div>
                <div class="flex justify-between text-xl font-extrabold text-gray-900 pt-4 border-t border-dashed border-gray-200"><span>Total a Pagar</span><span id="cart-total" class="text-brand">$ 0</span></div>
            </div>
            <button onclick="app.handleOrderAction()" id="checkout-btn" class="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-gray-800 transition-all active:scale-[0.98]">Confirmar Pedido</button>
        </div>
    </div>
    <div id="cart-overlay" onclick="app.toggleCart()" class="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[55] hidden opacity-0 transition-opacity"></div>

    <!-- Auth Modal -->
    <div id="auth-modal" class="fixed inset-0 z-[70] hidden items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onclick="app.closeModal()"></div>
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative z-10 modal-enter">
            <button onclick="app.closeModal()" class="absolute top-5 right-5 text-gray-400 hover:text-gray-700"><i data-lucide="x" class="w-5 h-5"></i></button>
            <div id="login-form">
                <div class="text-center mb-8">
                    <h2 class="text-2xl font-extrabold text-gray-900">Bienvenido</h2>
                    <p class="text-gray-500 text-sm mt-2">Inicia sesión para continuar.</p>
                </div>
                <form onsubmit="app.handleLogin(event)" class="space-y-4">
                    <input type="email" class="w-full border-gray-200 border rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand outline-none" placeholder="Correo" required>
                    <button type="submit" class="w-full bg-brand text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg">Ingresar</button>
                </form>
                <div class="mt-8 text-center text-sm text-gray-500">¿Nuevo? <button onclick="app.switchAuth('register')" class="text-brand font-bold hover:underline">Regístrate gratis</button></div>
            </div>
            <div id="register-form" class="hidden">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-extrabold text-gray-900">Crear Cuenta</h2>
                </div>
                <form onsubmit="app.handleRegister(event)" class="space-y-4">
                    <input type="text" class="w-full border-gray-200 border rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand outline-none" placeholder="Nombre" required>
                    <input type="email" class="w-full border-gray-200 border rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand outline-none" placeholder="Correo" required>
                    <div class="flex items-start gap-3 mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <input type="checkbox" id="user-terms" required class="mt-1 w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand">
                        <label for="user-terms" class="text-xs text-gray-500 leading-snug">Acepto los <button type="button" onclick="app.openLegal('terms')" class="text-brand font-bold hover:underline">Términos</button> y <button type="button" onclick="app.openLegal('privacy')" class="text-brand font-bold hover:underline">Política de Privacidad</button>.</label>
                    </div>
                    <button type="submit" class="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg">Registrarme</button>
                </form>
                <div class="mt-6 text-center text-sm text-gray-500">¿Ya tienes cuenta? <button onclick="app.switchAuth('login')" class="text-brand font-bold hover:underline">Entrar</button></div>
            </div>
        </div>
    </div>

    <!-- Legal Modal -->
    <div id="legal-modal" class="fixed inset-0 z-[80] hidden items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onclick="document.getElementById('legal-modal').classList.add('hidden')"></div>
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative z-10 modal-enter">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 class="text-xl font-bold text-gray-900" id="legal-title">Legal</h2>
                <button onclick="document.getElementById('legal-modal').classList.add('hidden')" class="bg-gray-100 hover:bg-gray-200 p-2 rounded-full"><i data-lucide="x" class="w-5 h-5 text-gray-600"></i></button>
            </div>
            <div class="p-8 overflow-y-auto legal-content" id="legal-body"></div>
            <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                <button onclick="document.getElementById('legal-modal').classList.add('hidden')" class="bg-brand text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md">Entendido</button>
            </div>
        </div>
    </div>

    <!-- Product Modal -->
    <div id="product-modal" class="fixed inset-0 z-[75] hidden items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onclick="app.closeProductModal()"></div>
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10 modal-enter max-h-[90vh] overflow-y-auto">
            <h2 class="text-2xl font-bold mb-6 text-gray-900">Producto</h2>
            <form onsubmit="app.saveProduct(event)" class="space-y-5">
                <input type="hidden" id="prod-id">
                <div><label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Nombre</label><input type="text" id="prod-name" class="w-full border-gray-200 rounded-xl p-3 bg-gray-50 text-sm focus:ring-2 focus:ring-brand outline-none" required></div>
                <div><label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Descripción</label><textarea id="prod-desc" class="w-full border-gray-200 rounded-xl p-3 bg-gray-50 text-sm focus:ring-2 focus:ring-brand outline-none" rows="3"></textarea></div>
                <div><label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Precio (COP)</label><input type="number" id="prod-price" class="w-full border-gray-200 rounded-xl p-3 bg-gray-50 text-sm focus:ring-2 focus:ring-brand outline-none" required></div>
                <div><label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Imagen URL</label><input type="url" id="prod-img" class="w-full border-gray-200 rounded-xl p-3 bg-gray-50 text-sm focus:ring-2 focus:ring-brand outline-none" placeholder="https://..."></div>
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="app.closeProductModal()" class="flex-1 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-bold">Cancelar</button>
                    <button type="submit" class="flex-1 bg-brand text-white py-3.5 rounded-xl text-sm font-bold shadow-lg">Guardar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Logic -->
    <script>
        // --- CONFIGURACIÓN ADMIN (Pon tu número aquí) ---
        const ADMIN_PHONE = '573000000000'; 

        const app = {
            state: { cart: [], user: null, orders: [], restaurants: [], filteredRestaurants: [], myStore: null, isWhatsAppMode: false, currentView: 'home', points: 0, balance: 0, cookiesAccepted: false },
            
            // Legal Texts
            legalTexts: {
                terms: `<h3>1. Objeto</h3><p>SaborClick intermedia entre usuarios y comercios bajo mandato.</p><h3>2. Datos</h3><p>Cumplimos con la Ley 1581 de 2012.</p>`,
                privacy: `<h3>1. Responsable</h3><p>SaborClick trata tus datos para gestionar pedidos.</p>`,
                cookies: `<h3>Cookies</h3><p>Usamos cookies técnicas esenciales.</p>`,
                retracto: `<h3>Retracto</h3><p>No aplica en alimentos perecederos.</p>`
            },
            
            // Storage
            saveState: function() { localStorage.setItem('sc_data_v12', btoa(JSON.stringify(this.state))); },
            loadState: function() {
                const d = localStorage.getItem('sc_data_v12');
                if (d) { try { this.state = { ...this.state, ...JSON.parse(atob(d)) }; this.state.filteredRestaurants = this.state.restaurants; } catch(e){} }
            },
            
            init: function() {
                this.loadState();
                const params = new URLSearchParams(window.location.search);
                let shared = false;
                
                if(!this.state.cookiesAccepted) {
                    document.getElementById('cookie-banner').classList.remove('hidden');
                    document.getElementById('cookie-banner').classList.add('flex');
                }

                if (params.has('store')) {
                    try { 
                        const sd = JSON.parse(atob(params.get('store')));
                        this.loadSharedStore(sd);
                        shared = true;
                    } catch (e) { console.log('Link roto'); }
                }
                if(!shared) this.renderView('home');
                
                this.updateCartUI();
                this.updateAuthUI();
                lucide.createIcons();
            },
            
            navigate: function(view) {
                this.state.currentView = view;
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                const btn = document.getElementById(`nav-${view === 'my-business' ? 'biz' : view}`);
                if(btn) btn.classList.add('active');
                if(view === 'home') this.goHome();
                else if(view === 'orders') this.goToOrders();
                else if(view === 'profile') this.renderProfileView();
                window.scrollTo(0,0);
            },
            renderView: function(v) { this.navigate(v); },
            goHome: function() { this.state.selectedRestaurant = null; this.state.filteredRestaurants = this.state.restaurants; const s=document.getElementById('search-input'); if(s) s.value=''; this.renderHome(); },
            
            // Renderers
            renderHome: function() {
                const c = document.getElementById('main-container');
                let html = '';
                
                // My Store Card
                let myStoreHTML = '';
                if(this.state.myStore) {
                    myStoreHTML = `<div onclick="app.openRestaurant(${this.state.myStore.id})" class="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm mb-8 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-brand/30 transition-all group"><div class="flex items-center gap-4"><div class="bg-orange-50 p-3 rounded-xl text-brand group-hover:scale-110 transition-transform"><i data-lucide="store" class="w-6 h-6"></i></div><div><p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tu Panel</p><h3 class="font-extrabold text-gray-900 text-lg">${this.state.myStore.name}</h3></div></div><div class="text-brand text-xs font-bold flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full group-hover:bg-brand group-hover:text-white transition-colors">Gestionar <i data-lucide="arrow-right" class="w-3 h-3"></i></div></div>`;
                }

                if (this.state.restaurants.length === 0 && !this.state.myStore) {
                    html = `<div class="flex flex-col items-center justify-center p-8 text-center min-h-[75vh] fade-enter"><div class="bg-gradient-brand w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-orange-200 mb-8 transform -rotate-6 transition-transform hover:rotate-0"><i data-lucide="layers" class="w-12 h-12 text-white"></i></div><h1 class="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Bienvenido</h1><p class="text-gray-500 mb-10 max-w-md mx-auto text-lg">Crea tu tienda digital y recibe pedidos por WhatsApp.</p><button onclick="app.goToMyBusiness()" class="w-full max-w-xs bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-3 hover:-translate-y-1"><i data-lucide="rocket" class="w-5 h-5"></i> Crear Tienda Gratis</button></div>`;
                } else {
                    html = `
                        <div class="max-w-7xl mx-auto px-4 pt-8 fade-enter">
                            <!-- Dynamic Banner Carousel -->
                            <div class="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory mb-8">
                                <div class="snap-center min-w-[85%] md:min-w-[400px] h-48 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg group cursor-pointer hover:shadow-2xl transition-all border border-white/20">
                                    <div class="relative z-10 max-w-[70%]">
                                        <span class="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg mb-2 inline-block">HOY</span>
                                        <h2 class="text-2xl font-extrabold mb-1">Envíos GRATIS</h2>
                                        <p class="text-white/90 text-xs mb-3 font-medium">Por compras superiores a $20k</p>
                                        <button class="bg-white text-orange-600 px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform shadow-sm">Pedir Ya</button>
                                    </div>
                                    <img src="https://cdn-icons-png.flaticon.com/512/3081/3081098.png" class="absolute -right-2 -bottom-2 w-32 h-32 object-contain group-hover:rotate-12 transition-transform drop-shadow-xl">
                                </div>
                                <div class="snap-center min-w-[85%] md:min-w-[400px] h-48 bg-gray-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg group cursor-pointer border border-gray-700">
                                    <div class="relative z-10">
                                        <span class="bg-brand text-white text-[10px] font-bold px-2 py-1 rounded-lg mb-2 inline-block">ALIADOS</span>
                                        <h3 class="text-xl font-bold mb-1">Crea tu Tienda</h3>
                                        <p class="text-gray-400 text-xs mb-3">Vende sin pagar comisiones.</p>
                                        <button onclick="app.goToMyBusiness()" class="bg-brand text-white px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform shadow-sm">Empezar</button>
                                    </div>
                                    <i data-lucide="store" class="absolute right-4 bottom-4 w-24 h-24 text-gray-800 group-hover:text-gray-700 transition-colors"></i>
                                </div>
                            </div>
                            
                            ${myStoreHTML}

                            <div class="flex justify-between items-end mb-6">
                                <h2 class="text-xl font-extrabold text-gray-900">Restaurantes cerca</h2>
                                <span class="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">${this.state.filteredRestaurants.length} activos</span>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                                ${this.state.filteredRestaurants.map(r => `
                                    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col h-full hover:-translate-y-1 relative">
                                        ${r.isPromoted ? `<div class="absolute top-3 right-3 z-10 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1"><i data-lucide="star" class="w-3 h-3 fill-current"></i> Recomendado</div>` : ''}
                                        <div class="h-48 overflow-hidden relative bg-gray-100" onclick="app.openRestaurant(${r.id})">
                                            <img src="${r.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                                            <div class="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 text-gray-700">
                                                <i data-lucide="clock" class="w-3.5 h-3.5 text-brand"></i> ${r.time}
                                            </div>
                                        </div>
                                        <div class="p-5 flex-1 flex flex-col" onclick="app.openRestaurant(${r.id})">
                                            <div class="flex justify-between items-start mb-2">
                                                <h3 class="font-bold text-gray-900 text-lg line-clamp-1 group-hover:text-brand transition-colors">${r.name}</h3>
                                                <span class="bg-gray-50 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1"><i data-lucide="star" class="w-3 h-3 fill-yellow-400 text-yellow-400"></i> ${r.rating}</span>
                                            </div>
                                            <p class="text-sm text-gray-500 mb-4 line-clamp-1">${r.category} • ${r.city}</p>
                                            <div class="mt-auto pt-4 border-t border-gray-50 flex items-center gap-2 text-xs font-medium text-gray-500">
                                                <i data-lucide="bike" class="w-4 h-4 text-brand"></i> Envío: <span class="text-gray-900 font-bold text-green-600">GRATIS</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
                c.innerHTML = html;
                lucide.createIcons();
            },
            
            goToMyBusiness: function() {
                const c = document.getElementById('main-container');
                if (!this.state.myStore) {
                    c.innerHTML = `<div class="max-w-md mx-auto px-4 py-12 fade-enter"><button onclick="app.goHome()" class="mb-8 flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"><i data-lucide="arrow-left" class="w-4 h-4"></i> Volver al inicio</button><div class="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden"><div class="absolute top-0 left-0 w-full h-2 bg-gradient-brand"></div><div class="mb-8"><h2 class="text-2xl font-extrabold text-gray-900">Alta de Comercio</h2><p class="text-sm text-gray-500 mt-2">Únete a la red digital.</p></div><form onsubmit="app.handleBusinessRegister(event)" class="space-y-5"><div><label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nombre</label><input id="biz-name" class="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand outline-none" required></div><div><label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Categoría</label><select id="biz-type" class="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50"><option>Restaurante</option><option>Cafetería</option></select></div><div><label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">WhatsApp (+57)</label><input id="biz-phone" type="tel" class="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand outline-none" required></div><div><label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Ciudad</label><input id="biz-city" class="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand outline-none" required></div><div class="flex items-start gap-3 mt-4 py-3 border-t border-gray-100"><input type="checkbox" id="biz-terms" required class="mt-1 border-gray-300 rounded text-brand focus:ring-brand w-4 h-4"><label for="biz-terms" class="text-xs text-gray-500 leading-snug">Acepto los <button type="button" onclick="app.openLegal('terms')" class="text-brand font-bold">Términos</button>.</label></div><button class="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg">Registrar</button></form></div></div>`;
                } else {
                    const s = this.state.myStore;
                    const url = `${window.location.origin}${window.location.pathname}?store=${btoa(JSON.stringify(s))}`;
                    c.innerHTML = `<div class="max-w-4xl mx-auto px-4 py-8 fade-enter"><div class="flex items-center justify-between mb-8"><div><h1 class="text-2xl font-extrabold text-gray-900">Panel</h1><p class="text-sm text-gray-500">Gestión de <strong>${s.name}</strong></p></div><button onclick="app.goHome()" class="text-xs font-bold text-gray-500 border border-gray-200 px-4 py-2 rounded-lg">Salir</button></div><div class="bg-gray-900 text-white p-6 rounded-3xl shadow-xl mb-10 relative overflow-hidden"><div class="relative z-10"><p class="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Enlace Público</p><div class="flex gap-3"><input readonly value="${url}" class="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs text-white font-mono"><button onclick="app.copyLink('${url}')" class="bg-white text-gray-900 px-5 py-2 rounded-xl text-xs font-bold">Copiar</button></div></div><div class="flex gap-3 w-full md:w-auto relative z-10 mt-4"><button onclick="app.openRestaurant(${s.id})" class="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2">Vista Previa</button><button onclick="app.deleteStore()" class="flex-1 bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2">Eliminar</button></div></div><div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-200"><h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">Inventario</h2><button onclick="app.openProductModal()" class="bg-brand text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md">Nuevo Producto</button></div><div class="grid gap-4">${s.menu.map(p => `<div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5"><div class="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0"><img src="${p.img}" class="w-full h-full object-cover"></div><div class="flex-1 min-w-0"><h3 class="font-bold text-gray-900 text-base truncate">${p.name}</h3><p class="text-xs text-gray-500 truncate">${p.desc}</p><p class="text-sm font-bold text-brand mt-1.5">${app.formatMoney(p.price)}</p></div><button onclick="app.deleteProduct(${p.id})" class="p-2.5 text-gray-400 hover:text-red-500"><i data-lucide="trash-2" class="w-5 h-5"></i></button></div>`).join('')}</div></div>`;
                }
                lucide.createIcons();
                window.scrollTo(0,0);
            },
            handleBusinessRegister: function(e) {
                e.preventDefault(); const n = document.getElementById('biz-name').value; const p = document.getElementById('biz-phone').value; const ci = document.getElementById('biz-city').value; const ca = document.getElementById('biz-type').value;
                const newStore = { id: Date.now(), name: n, phone: p, city: ci, category: ca, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800", rating: 5.0, delivery: '$ 3.000', time: '30 min', menu: [], isPromoted: true }; // New stores get promoted flag for demo
                this.state.myStore = newStore; this.state.restaurants.unshift(newStore); this.saveState(); this.goToMyBusiness(); this.showToast("Registrado");
            },
            deleteStore: function() { if(confirm("¿Eliminar?")) { this.state.restaurants = this.state.restaurants.filter(r => r.id !== this.state.myStore.id); this.state.myStore = null; this.saveState(); this.goToMyBusiness(); } },
            openProductModal: function() { document.getElementById('product-modal').classList.remove('hidden'); document.getElementById('product-modal').classList.add('flex'); },
            closeProductModal: function() { document.getElementById('product-modal').classList.add('hidden'); document.getElementById('product-modal').classList.remove('flex'); },
            saveProduct: function(e) {
                e.preventDefault(); const n = document.getElementById('prod-name').value; const d = document.getElementById('prod-desc').value; const p = document.getElementById('prod-price').value; const i = document.getElementById('prod-img').value || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
                const np = { id: Date.now(), name: n, desc: d, price: parseInt(p), img: i };
                if(this.state.myStore) { this.state.myStore.menu.push(np); const idx = this.state.restaurants.findIndex(r => r.id === this.state.myStore.id); if(idx !== -1) this.state.restaurants[idx] = this.state.myStore; this.saveState(); this.closeProductModal(); this.goToMyBusiness(); }
            },
            deleteProduct: function(id) { if(confirm("¿Borrar?")) { this.state.myStore.menu = this.state.myStore.menu.filter(p => p.id !== id); const idx = this.state.restaurants.findIndex(r => r.id === this.state.myStore.id); if(idx !== -1) this.state.restaurants[idx] = this.state.myStore; this.saveState(); this.goToMyBusiness(); } },
            openRestaurant: function(id) {
                const r = this.state.restaurants.find(x => x.id === id); if(!r) return; this.state.selectedRestaurant = r;
                const url = `${window.location.origin}${window.location.pathname}?store=${btoa(JSON.stringify(r))}`;
                const isMine = this.state.myStore && this.state.myStore.id === r.id;
                const c = document.getElementById('main-container');
                c.innerHTML = `<div class="relative h-[40vh] md:h-[50vh] bg-gray-900"><img src="${r.image}" class="w-full h-full object-cover opacity-80"><div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div><div class="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 safe-top"><button onclick="app.goHome()" class="bg-white/10 backdrop-blur-xl text-white p-3 rounded-full hover:bg-white/20 transition-all border border-white/10 shadow-lg"><i data-lucide="arrow-left" class="w-5 h-5"></i></button><div class="flex gap-3">${isMine ? `<button onclick="app.goToMyBusiness()" class="bg-white text-gray-900 px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-white hover:bg-gray-100 transition-colors">Editar</button>` : ''}<button onclick="app.copyLink('${url}')" class="bg-white/10 backdrop-blur-xl text-white p-3 rounded-full hover:bg-white/20 border border-white/10 shadow-lg"><i data-lucide="share-2" class="w-5 h-5"></i></button></div></div><div class="absolute bottom-0 left-0 w-full p-6 md:p-10 text-white max-w-7xl mx-auto"><h1 class="text-3xl md:text-6xl font-extrabold mb-3 tracking-tight shadow-sm">${r.name}</h1><div class="flex flex-wrap items-center gap-3 text-xs md:text-sm font-semibold text-white/90"><span class="bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm uppercase tracking-wide">${r.category}</span><span class="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-lg border border-yellow-500/30 text-yellow-300"><i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i> ${r.rating}</span><span class="bg-black/20 px-2 py-1 rounded-lg flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i> ${r.time}</span></div></div></div><div class="max-w-7xl mx-auto px-4 py-8 -mt-6 relative z-10"><div class="bg-white rounded-t-[2rem] min-h-[500px] p-6 md:p-10 shadow-[0_-20px_60px_rgba(0,0,0,0.1)]"><h2 class="text-xl font-extrabold mb-8 text-gray-900 border-b border-gray-100 pb-4">Menú del Día</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${r.menu.map(i => `<div onclick="app.addToCart(${r.id}, ${i.id})" class="flex gap-4 p-4 rounded-3xl border border-gray-100 hover:border-brand/30 transition-all cursor-pointer group bg-white shadow-sm hover:shadow-lg transform hover:-translate-y-1"><div class="flex-1 flex flex-col justify-between py-1"><div><h3 class="font-bold text-gray-900 text-base group-hover:text-brand transition-colors">${i.name}</h3><p class="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">${i.desc}</p></div><div class="font-extrabold text-gray-900 text-base mt-3">${app.formatMoney(i.price)}</div></div><div class="relative w-28 h-28 flex-shrink-0"><img src="${i.img}" class="w-full h-full object-cover rounded-2xl bg-gray-100 shadow-inner"><div class="absolute bottom-2 right-2 bg-white text-gray-900 p-2 rounded-xl shadow-md group-hover:bg-brand group-hover:text-white transition-colors"><i data-lucide="plus" class="w-4 h-4 font-bold"></i></div></div></div>`).join('')}</div></div></div>`;
                lucide.createIcons();
                window.scrollTo(0,0);
            },
            
            // Utils
            loadSharedStore: function(s) { const idx = this.state.restaurants.findIndex(r => r.id === s.id); if (idx === -1) { this.state.restaurants.unshift(s); } else { this.state.restaurants[idx] = s; } this.state.filteredRestaurants = this.state.restaurants; this.openRestaurant(s.id); },
            copyLink: function(u) { navigator.clipboard.writeText(u).then(() => app.showToast("Copiado")); },
            showToast: function(m) { const t=document.getElementById('toast'); document.getElementById('toast-msg').innerText=m; t.classList.remove('opacity-0','pointer-events-none','translate-y-[-10px]'); setTimeout(()=>{t.classList.add('opacity-0','pointer-events-none','translate-y-[-10px]')},3000); },
            handleSearch: function(q) { const t=q.toLowerCase(); this.state.filteredRestaurants = this.state.restaurants.filter(r=>r.name.toLowerCase().includes(t)||r.category.toLowerCase().includes(t)); if(!this.state.selectedRestaurant) this.renderHome(); },
            addToCart: function(rId, iId) { const r=this.state.restaurants.find(x=>x.id===rId); const i=r.menu.find(x=>x.id===iId); if(this.state.cart.length>0 && this.state.cart[0].restId!==rId) { if(!confirm("¿Vaciar canasta?")) return; this.state.cart=[]; } const ex=this.state.cart.find(x=>x.id===iId); if(ex) ex.quantity++; else this.state.cart.push({...i, quantity:1, restId:rId}); this.saveState(); this.updateCartUI(); this.showToast("Agregado"); },
            updateCartUI: function() { 
                const c=this.state.cart; const cnt=c.reduce((s,i)=>s+i.quantity,0); const tot=c.reduce((s,i)=>s+(i.price*i.quantity),0);
                ['cart-count','nav-cart-count'].forEach(id=>{ const el=document.getElementById(id); if(el){el.innerText=cnt; el.classList.toggle('scale-0',cnt===0);} });
                const list=document.getElementById('cart-items'); const btn=document.getElementById('checkout-btn');
                if(cnt===0) { if(list) list.innerHTML=`<div class="flex flex-col items-center justify-center h-full text-gray-400 py-10"><div class="bg-gray-50 p-4 rounded-full mb-3"><i data-lucide="shopping-cart" class="w-8 h-8 opacity-20"></i></div><p class="text-sm font-medium">Tu canasta está vacía</p></div>`; if(btn) {btn.innerHTML=`Confirmar Pedido`; btn.disabled=true;} }
                else { 
                    const r=this.state.restaurants.find(x=>x.id===c[0].restId); const isWa=r&&r.phone; this.state.isWhatsAppMode=isWa;
                    if(btn) { btn.disabled=false; btn.innerHTML=isWa?`<i data-lucide="message-circle" class="w-5 h-5"></i> Pedir por WhatsApp`:`Confirmar Pedido`; btn.className=isWa?"w-full bg-wa text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-200 hover:bg-green-600 transition-all flex items-center justify-center gap-2 transform active:scale-95":"w-full bg-brand text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 transform active:scale-95"; }
                    if(list) list.innerHTML=c.map(i=>`<div class="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm mb-3"><div class="flex-1"><div class="text-sm font-bold text-gray-900 line-clamp-1">${i.name}</div><div class="text-xs text-brand font-bold mt-0.5">${app.formatMoney(i.price)} x ${i.quantity}</div></div><div class="flex items-center gap-3 bg-gray-50 rounded-xl p-1.5 border border-gray-100"><button onclick="app.updateQty(${i.id},-1)" class="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-white hover:text-red-500 rounded-lg font-bold bg-white">-</button><span class="text-xs font-bold text-gray-900 w-4 text-center">${i.quantity}</span><button onclick="app.updateQty(${i.id},1)" class="w-7 h-7 flex items-center justify-center text-white hover:bg-orange-600 rounded-lg font-bold bg-brand">+</button></div></div>`).join('');
                }
                
                // --- FEE CALCULATION ---
                // Calculate fee (e.g. 5%) but show it as "Service Fee"
                const fee = Math.floor(tot * 0.05); 
                const final = tot + fee; // Free delivery logic here visually, but total includes fee
                
                const sub=document.getElementById('cart-subtotal'); if(sub) sub.innerText=this.formatMoney(tot);
                const totEl=document.getElementById('cart-total'); if(totEl) totEl.innerText=this.formatMoney(final);
                const feeEl=document.getElementById('cart-fee'); if(feeEl) feeEl.innerText=this.formatMoney(fee);
                lucide.createIcons();
            },
            handleOrderAction: function() { if(!this.state.user) return this.openModal('login'); if(this.state.isWhatsAppMode) this.sendWhatsAppOrder(); else alert("Error config."); },
            sendWhatsAppOrder: function() {
                const r=this.state.restaurants.find(x=>x.id===this.state.cart[0].restId); const tot=this.state.cart.reduce((s,i)=>s+(i.price*i.quantity),0);
                
                // Fee Logic for Message
                const fee = Math.floor(tot * 0.05); 
                const final = tot + fee;

                let msg=`*PEDIDO - SaborClick*%0A%0A*Comercio:* ${r.name}%0A*Cliente:* ${this.state.user.name}%0A%0A`; 
                this.state.cart.forEach(i=>{msg+=`▪ ${i.quantity}x ${i.name} | ${this.formatMoney(i.price*i.quantity)}%0A`}); 
                
                // Breakdown in message
                msg+=`%0ASubtotal: ${this.formatMoney(tot)}%0ATarifa Servicio: ${this.formatMoney(fee)}%0AEnvío: GRATIS%0A*TOTAL: ${this.formatMoney(final)}*`;
                
                const o={id:Date.now(), date:Date.now(), items:[...this.state.cart], total:final, restaurantName:r.name}; this.state.orders.push(o); this.state.cart=[]; this.saveState(); window.open(`https://wa.me/${ADMIN_PHONE}?text=${msg}`,'_blank'); this.updateCartUI(); this.closeCart(); this.navigate('orders');
            },
            toggleCart: function() { const s=document.getElementById('cart-sidebar'); const o=document.getElementById('cart-overlay'); if(s.classList.contains('translate-x-full')){s.classList.remove('translate-x-full');o.classList.remove('hidden');setTimeout(()=>o.classList.remove('opacity-0'),10);}else this.closeCart(); },
            closeCart: function() { const s=document.getElementById('cart-sidebar'); const o=document.getElementById('cart-overlay'); s.classList.add('translate-x-full'); o.classList.add('opacity-0'); setTimeout(()=>o.classList.add('hidden'),300); },
            updateQty: function(id, chg) { const i=this.state.cart.find(x=>x.id===id); if(i){i.quantity+=chg; if(i.quantity<=0) this.state.cart=this.state.cart.filter(x=>x.id!==id); this.saveState(); this.updateCartUI();} },
            openModal: function(t) { document.getElementById('auth-modal').classList.remove('hidden'); if(t==='login'){document.getElementById('login-form').classList.remove('hidden');document.getElementById('register-form').classList.add('hidden');}else{document.getElementById('login-form').classList.add('hidden');document.getElementById('register-form').classList.remove('hidden');} },
            closeModal: function() { document.getElementById('auth-modal').classList.add('hidden'); },
            switchAuth: function(t) { this.openModal(t); },
            handleLogin: function(e) { e.preventDefault(); const email=e.target.querySelector('input[type="email"]').value; this.state.user={name:email.split('@')[0], email}; this.saveState(); this.updateAuthUI(); this.closeModal(); this.showToast("Sesión iniciada"); },
            handleRegister: function(e) { e.preventDefault(); const cb=document.getElementById('user-terms'); if(!cb.checked) { alert("Acepta los términos."); return; } this.handleLogin(e); },
            logout: function() { if(confirm('¿Cerrar sesión?')) { this.state.user=null; this.saveState(); this.updateAuthUI(); this.goHome(); } },
            updateAuthUI: function() { 
                const btn=document.getElementById('desktop-auth'); const btns=document.getElementById('auth-buttons');
                if(this.state.user) { if(btns) btns.classList.add('hidden'); if(btn) { btn.classList.remove('hidden'); document.getElementById('login-btn-desk').classList.add('hidden'); document.getElementById('user-profile-desk').classList.remove('hidden'); document.querySelector('.user-name').innerText=this.state.user.name; document.querySelector('.user-initials').innerText=this.state.user.name.substring(0,2).toUpperCase(); } } 
                else { if(btns) btns.classList.remove('hidden'); if(btn) { document.getElementById('login-btn-desk').classList.remove('hidden'); document.getElementById('user-profile-desk').classList.add('hidden'); } }
            },
            formatMoney: function(a) { return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(a); },
            goToOrders: function() { if(!this.state.user) return this.openModal('login'); const c=document.getElementById('main-container'); const os=this.state.orders.sort((a,b)=>b.date-a.date); c.innerHTML=`<div class="max-w-2xl mx-auto px-4 py-8 fade-enter"><div class="flex items-center gap-3 mb-6"><button onclick="app.goHome()" class="bg-white p-2 rounded-lg border border-slate-200 shadow-sm hover:bg-gray-50"><i data-lucide="arrow-left" class="w-4 h-4 text-gray-600"></i></button><h1 class="text-xl font-bold text-gray-900">Historial de Pedidos</h1></div>${os.length===0?'<div class="text-center py-20 text-gray-400 bg-white border border-gray-100 rounded-xl"><p>Sin pedidos.</p></div>':`<div class="space-y-3">${os.map(o=>`<div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-gray-300 transition-colors"><div><h3 class="font-bold text-gray-900 text-sm">${o.restaurantName}</h3><p class="text-xs text-gray-500 mt-0.5">${new Date(o.date).toLocaleDateString()}</p></div><div class="text-right"><span class="block font-bold text-gray-900 text-sm">${app.formatMoney(o.total)}</span><span class="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Completado</span></div></div>`).join('')}</div>`}</div>`; lucide.createIcons(); },
            goToWallet: function() { if(!this.state.user) return this.openModal('login'); const c=document.getElementById('main-container'); c.innerHTML=`<div class="max-w-md mx-auto px-4 pt-8 fade-enter"><div class="bg-gradient-brand rounded-3xl p-8 text-white shadow-lg mb-6"><p class="text-white/80 text-sm mb-1">Saldo</p><h1 class="text-4xl font-extrabold">${app.formatMoney(this.state.balance||0)}</h1></div><div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"><div class="flex justify-between items-center"><h3 class="font-bold text-gray-900">Puntos</h3><span class="text-brand font-bold">${this.state.points}</span></div><div class="mt-4"><button onclick="alert('Funcionalidad próximamente')" class="w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-100">Ver Transacciones</button></div></div></div>`; lucide.createIcons(); },
            exportData: function() { const d="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(this.state)); const a=document.createElement('a'); a.href=d; a.download="saborclick_backup.json"; document.body.appendChild(a); a.click(); a.remove(); },
            openLegal: function(t) { const m=document.getElementById('legal-modal'); const ti=document.getElementById('legal-title'); const b=document.getElementById('legal-body'); const ts={terms:'Términos',privacy:'Privacidad',cookies:'Cookies',retracto:'Derecho de Retracto'}; ti.innerText=ts[t]; b.innerHTML=this.legalTexts[t]; m.classList.remove('hidden'); },
            acceptCookies: function() { this.state.cookiesAccepted=true; this.saveState(); document.getElementById('cookie-banner').classList.add('hidden'); },
            goToSupport: function() { window.open("https://wa.me/573000000000?text=Hola,%20necesito%20soporte", "_blank"); }
        };
        window.onload = () => app.init();
    </script>
</body>
</html>
