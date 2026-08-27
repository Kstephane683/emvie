/* ============================================================
   TEMPLATE MLM — SCRIPT PARTAGÉ (v4.4.3)
   ============================================================
   Corrige bugs :
   - #3 : Menu hamburger fonctionnel (toggle overlay)
   - #4 : addToCart() via data-* attributes (escape apostrophes)
   - #6 : Fonctions cart partagées sur toutes les pages
   ============================================================ */

(function() {
    'use strict';

    // ====== PANIER (localStorage) ======
    const CART_KEY = 'panier_site';

    // BUGFIX (v4.4.6) : le catch de getCart() appelait localStorage.removeItem() sans
    // protection. Quand localStorage est totalement inaccessible (origine "opaque" —
    // typiquement en ouvrant le site en local via file://, navigation privée, storage
    // désactivé...), cette ligne levait à son tour une exception NON interceptée qui
    // remontait jusqu'à init() et stoppait TOUTES les fonctionnalités appelées après
    // (galerie produit, menu, filtres, etc.), pas seulement le panier.
    function getCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        } catch (e) {
            console.warn('Panier corrompu ou localStorage indisponible', e);
            try { localStorage.removeItem(CART_KEY); } catch (e2) { /* localStorage totalement indisponible : rien à faire de plus */ }
            return [];
        }
    }

    function saveCart(cart) {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
        } catch (e) {
            console.warn('Impossible de sauvegarder le panier (localStorage indisponible)', e);
        }
        updateCartUI();
    }

    function addToCart(id, nom, prix, image) {
        const cart = getCart();
        const existing = cart.find(item => item.id == id);
        if (existing) {
            existing.qte += 1;
        } else {
            cart.push({ id: parseInt(id), nom: String(nom), prix: parseInt(prix), image: String(image), qte: 1 });
        }
        saveCart(cart);
        showToast(`${nom} ajouté au panier`);
    }

    function removeFromCart(id) {
        let cart = getCart().filter(item => item.id != id);
        saveCart(cart);
    }

    function changeQty(id, delta) {
        let cart = getCart();
        const item = cart.find(i => i.id == id);
        if (item) {
            item.qte += delta;
            if (item.qte <= 0) {
                cart = cart.filter(i => i.id != id);
            }
            saveCart(cart);
        }
    }

    function updateCartUI() {
        const cart = getCart();
        const count = cart.reduce((sum, item) => sum + item.qte, 0);
        const headerBadge = document.getElementById('cart-count-header');
        const mobileBadge = document.getElementById('cart-count-mobile');

        if (headerBadge) {
            headerBadge.textContent = count;
            headerBadge.style.display = count > 0 ? 'flex' : 'none';
        }
        if (mobileBadge) {
            mobileBadge.textContent = count;
            mobileBadge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ====== MENU HAMBURGER (bugfix #3) ======
    function initMenuToggle() {
        const toggle = document.getElementById('menu-toggle');
        if (!toggle) return;

        // Créer l'overlay s'il n'existe pas déjà
        let overlay = document.querySelector('.nav__menu-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'nav__menu-overlay';
            // Cloner le menu principal
            const menu = document.querySelector('.nav__menu');
            if (menu) {
                overlay.innerHTML = `<ul>${menu.innerHTML}</ul>`;
            } else {
                // Menu par défaut si pas de .nav__menu
                overlay.innerHTML = `<ul>
                    <li><a href="accueil.html">Boutique</a></li>
                    <li><a href="opportunite.html">Opportunité</a></li>
                    <li><a href="panier.html">Panier</a></li>
                    <li><a href="contact.html">Contact</a></li>
                </ul>`;
            }
            // Insérer après le header
            const header = document.querySelector('.header');
            if (header && header.parentNode) {
                header.parentNode.insertBefore(overlay, header.nextSibling);
            } else {
                document.body.insertBefore(overlay, document.body.firstChild);
            }
        }

        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            overlay.classList.toggle('open');
            const icon = toggle.querySelector('i');
            if (icon) {
                if (overlay.classList.contains('open')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Fermer l'overlay quand on clique sur un lien
        overlay.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                overlay.classList.remove('open');
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Fermer l'overlay quand on clique en dehors
        document.addEventListener('click', function(e) {
            if (!overlay.contains(e.target) && !toggle.contains(e.target)) {
                overlay.classList.remove('open');
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    // ====== BOUTONS "AJOUTER AU PANIER" via data-* (bugfix #4) ======
    function initAddToCartButtons() {
        // v4.4.4 : BUGFIX — éviter le double event listener
        // Si l'utilisateur clique sur un bouton .btn--add qui est à l'intérieur d'un <a>,
        // le clic peut propager au <a> et déclencher un second addToCart via un autre listener
        // Solution : marquer chaque bouton comme initialisé avec data-cart-init="true"

        // Sélecteur élargi : boutons .btn--add (accueil/produits) + boutons avec data-id
        // (bouton add-to-cart-main et add-to-cart-sticky sur produit-nom.html)
        const buttons = document.querySelectorAll('.btn--add, [data-id][data-nom][data-prix]');

        buttons.forEach(btn => {
            // v4.4.4 : éviter double-initialisation
            if (btn.dataset.cartInit === 'true') return;
            btn.dataset.cartInit = 'true';

            // Convertir anciens onclick en data-* (rétrocompat)
            if (btn.hasAttribute('onclick')) {
                const match = btn.getAttribute('onclick').match(/addToCart\((\d+),\s*'([^']*)',\s*(\d+),\s*'([^']*)'\)/);
                if (match) {
                    btn.removeAttribute('onclick');
                    if (!btn.hasAttribute('data-id')) btn.setAttribute('data-id', match[1]);
                    if (!btn.hasAttribute('data-nom')) btn.setAttribute('data-nom', match[2].replace(/\\'/g, "'"));
                    if (!btn.hasAttribute('data-prix')) btn.setAttribute('data-prix', match[3]);
                    if (!btn.hasAttribute('data-image')) btn.setAttribute('data-image', match[4]);
                }
            }

            // v4.4.4 : handler unique avec capture + stopPropagation
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // v4.4.4 : empêche la propagation au <a> parent
                const id = this.getAttribute('data-id');
                const nom = this.getAttribute('data-nom') || 'Produit';
                const prix = this.getAttribute('data-prix') || 0;
                const image = this.getAttribute('data-image') || '';
                if (id) {
                    addToCart(id, nom, prix, image);
                } else {
                    console.warn('Bouton addToCart sans data-id', this);
                }
            }, true); // v4.4.4 : useCapture=true pour intercepter AVANT les autres listeners
        });
    }

    // ====== GALERIE PRODUIT (page produit-nom) ======
    function initProductGallery() {
        const mainImg = document.getElementById('main-product-img');
        const thumbsContainer = document.getElementById('gallery-thumbs');
        const thumbs = document.querySelectorAll('.gallery__thumb');
        if (!mainImg || thumbs.length === 0) return;

        // v4.4.4 : masquer la thumbnail qui correspond à l'image principale
        // (data-main-image est lu depuis le container)
        const mainSrc = thumbsContainer ? thumbsContainer.dataset.mainImage : '';
        thumbs.forEach(thumb => {
            const thumbSrc = thumb.dataset.src || '';
            // Comparaison tolérante : on compare juste le nom du fichier (sans query string)
            const thumbName = thumbSrc.split('/').pop().split('?')[0];
            const mainName = mainSrc.split('/').pop().split('?')[0];
            if (thumbName && mainName && thumbName === mainName) {
                thumb.style.display = 'none';
            }
        });

        thumbs.forEach(thumb => {
            thumb.addEventListener('click', function(e) {
                e.preventDefault();
                const img = this.querySelector('img');
                if (img) {
                    mainImg.src = img.src;
                    thumbs.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });
    }

    // ====== ZOOM SUR IMAGE PRODUIT ======
    function initProductZoom() {
        const container = document.getElementById('zoom-container');
        const mainImg = document.getElementById('main-product-img');
        if (!container || !mainImg) return;

        container.addEventListener('mousemove', function(e) {
            const rect = container.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            mainImg.style.transformOrigin = `${x}% ${y}%`;
            mainImg.style.transform = 'scale(1.5)';
        });

        container.addEventListener('mouseleave', function() {
            mainImg.style.transform = 'scale(1)';
            mainImg.style.transformOrigin = 'center center';
        });
    }

    // ====== FILTRES CATALOGUE ======
    function initCatalogFilters() {
        const grid = document.getElementById('products-grid');
        const searchInput = document.getElementById('search-input');
        const filtersWrapper = document.getElementById('filters-wrapper');
        const emptyState = document.getElementById('empty-state');
        if (!grid || !searchInput || !filtersWrapper) return;

        const cards = Array.from(grid.querySelectorAll('.product-card'));
        if (cards.length === 0) return;

        // v4.4.4 : BUGFIX — dédupliquer les catégories avec Set
        // Avant : 5 produits "Soins corporels" → 5 boutons filtres identiques
        // Maintenant : Set() déduplique automatiquement
        const categoriesSet = new Set();
        cards.forEach(card => {
            const cat = card.dataset.category;
            if (cat && cat !== 'undefined' && cat !== 'null') {
                categoriesSet.add(cat);
            }
        });

        categoriesSet.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.category = cat;
            btn.textContent = cat;
            filtersWrapper.appendChild(btn);
        });

        let activeCategory = 'all';

        function filterProducts() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            let visibleCount = 0;

            cards.forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                const cat = card.dataset.category || '';
                const matchSearch = !searchTerm || name.includes(searchTerm);
                const matchCategory = activeCategory === 'all' || cat === activeCategory;

                if (matchSearch && matchCategory) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });

            if (emptyState) {
                emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
                grid.style.display = visibleCount === 0 ? 'none' : 'grid';
            }
        }

        searchInput.addEventListener('input', filterProducts);

        filtersWrapper.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                filtersWrapper.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                activeCategory = e.target.dataset.category;
                filterProducts();
            }
        });

        // Bouton reset si présent
        const resetBtn = document.querySelector('[onclick="resetFilters()"]');
        if (resetBtn) {
            resetBtn.removeAttribute('onclick');
            resetBtn.addEventListener('click', function(e) {
                e.preventDefault();
                searchInput.value = '';
                activeCategory = 'all';
                filtersWrapper.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                const allBtn = filtersWrapper.querySelector('.filter-btn[data-category="all"]');
                if (allBtn) allBtn.classList.add('active');
                filterProducts();
            });
        }

        // Exposer globalement pour rétrocompatibilité
        window.resetFilters = function() {
            if (resetBtn) resetBtn.click();
        };
    }

    // ====== ANIMATION COMPTEURS (page opportunite) ======
    function initCounters() {
        const compteurs = document.querySelectorAll('.stat-item .number');
        if (compteurs.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const cible = parseInt(el.dataset.cible) || 0;
                    const suffix = el.dataset.suffix || '';
                    let current = 0;
                    const step = Math.max(1, cible / 50);
                    const updateCount = () => {
                        if (current < cible) {
                            current += step;
                            el.textContent = Math.ceil(current) + suffix;
                            requestAnimationFrame(updateCount);
                        } else {
                            el.textContent = cible + suffix;
                        }
                    };
                    updateCount();
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        compteurs.forEach(c => observer.observe(c));
    }

    // ====== TABS PRODUIT (page produit-nom) ======
    function initProductTabs() {
        const tabBtns = document.querySelectorAll('.tabs__btn');
        const tabContents = document.querySelectorAll('.tabs__content');
        if (tabBtns.length === 0) return;

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const target = this.dataset.tab;
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                const targetContent = document.getElementById(target);
                if (targetContent) targetContent.classList.add('active');
            });
        });
    }

    // ====== STICKY BAR (page produit-nom) ======
    function initStickyBar() {
        const stickyBar = document.querySelector('.sticky-bar');
        const productInfo = document.querySelector('.product__info');
        if (!stickyBar || !productInfo) return;

        window.addEventListener('scroll', function() {
            const rect = productInfo.getBoundingClientRect();
            if (rect.bottom < 0) {
                stickyBar.style.display = 'flex';
            } else {
                stickyBar.style.display = 'none';
            }
        }, { passive: true });
    }

    // ====== QUANTITÉ (page produit-nom) ======
    function initQtySelector() {
        const qtyVal = document.querySelector('.qty-val');
        if (!qtyVal) return;

        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const delta = this.textContent.trim() === '+' ? 1 : -1;
                let val = parseInt(qtyVal.value || qtyVal.textContent || 1);
                val = Math.max(1, val + delta);
                if (qtyVal.tagName === 'INPUT') {
                    qtyVal.value = val;
                } else {
                    qtyVal.textContent = val;
                }
            });
        });
    }

    // ====== INIT GLOBAL ======
    // BUGFIX (v4.4.6) : chaque fonctionnalité est isolée dans son propre try/catch.
    // Avant, une erreur dans une seule fonction (ex. updateCartUI si localStorage
    // indisponible) interrompait silencieusement toutes les suivantes (galerie,
    // menu, filtres...) puisqu'un throw non intercepté stoppe le reste de init().
    function init() {
        const etapes = [
            updateCartUI, initMenuToggle, initAddToCartButtons, initProductGallery,
            initProductZoom, initCatalogFilters, initCounters, initProductTabs,
            initStickyBar, initQtySelector
        ];
        etapes.forEach(fn => {
            try { fn(); } catch (e) { console.warn(`Erreur dans ${fn.name}()`, e); }
        });
    }

    // Exposer les fonctions essentielles globalement (pour rétrocompatibilité onclick)
    window.addToCart = addToCart;
    window.updateCartUI = updateCartUI;
    window.showToast = showToast;
    window.getCart = getCart;
    window.saveCart = saveCart;
    window.changeQty = changeQty;
    window.removeItem = removeFromCart;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();


function initThemeToggle(){var t=document.createElement('button');t.className='theme-toggle';t.setAttribute('aria-label','Mode sombre');t.setAttribute('type','button');t.innerHTML='<i class="fa-solid fa-moon"></i><i class="fa-solid fa-sun"></i>';document.body.appendChild(t);var s=localStorage.getItem('theme')||'auto';applyTheme(s);t.addEventListener('click',function(){var c=document.documentElement.getAttribute('data-theme');var d=c==='dark'||(!c&&window.matchMedia('(prefers-color-scheme: dark)').matches);var n=d?'light':'dark';applyTheme(n);localStorage.setItem('theme',n)});window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){if(!localStorage.getItem('theme'))applyTheme('auto')})}function applyTheme(t){if(t==='dark')document.documentElement.setAttribute('data-theme','dark');else if(t==='light')document.documentElement.setAttribute('data-theme','light');else document.documentElement.removeAttribute('data-theme')}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initThemeToggle);else initThemeToggle();
