package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

var (
	httpStrikeCount   = make(map[string]int)
	httpStrikeCountMu sync.Mutex
)

// Genera la página 403 FORBIDDEN para IPs baneadas
func renderBannedPageHTML(ip, reason string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>403 FORBIDDEN - BANNED IP</title>
    <style>
        body { background-color: #0d1117; color: #c9d1d9; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #161b22; border: 2px solid #f85149; box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 32px; border-radius: 12px; max-width: 520px; text-align: center; }
        .header { background: rgba(248,81,73,0.15); border: 1px solid #f85149; color: #ff7b72; padding: 14px; margin-bottom: 20px; font-weight: 700; font-size: 18px; border-radius: 8px; }
        .details { background: #0d1117; border: 1px solid #30363d; padding: 16px; margin-top: 20px; font-family: monospace; font-size: 13px; text-align: left; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">⛔ 403 FORBIDDEN / IP BANEADA</div>
        <p><strong>SU DIRECCIÓN IP HA SIDO BLOQUEADA AUTOMÁTICAMENTE</strong></p>
        <p>El orquestador de defensa activa AegisTrap detectó actividad hostil en este servidor.</p>
        <div class="details">
            <strong>IP Baneada:</strong> %s<br>
            <strong>Causa:</strong> %s<br>
            <strong>Estado:</strong> Bloqueo HTTP / Socket Activo
        </div>
    </div>
</body>
</html>`, ip, reason)
}

func renderCloneLoginPageHTML(notice string) string {
	return renderAdminLoginPageHTML(notice)
}

// Genera la Tienda E-Commerce (CentroTelas)
func renderStorefrontHTML(notice string) string {
	noticeHTML := ""
	if notice != "" {
		noticeHTML = fmt.Sprintf(`<div style="background:#e0f2fe;border:1px solid #38bdf8;color:#0369a1;padding:12px 20px;border-radius:30px;font-size:14px;margin-bottom:24px;display:flex;align-items:center;gap:10px;font-weight:600;"><span>ℹ️</span><span>%s</span></div>`, notice)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CENTROTELAS. — Textiles de Alta Gama & Fibras Orgánicas</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', system-ui, -apple-system, sans-serif; }
        body { background-color: #ffffff; color: #1a2e1a; min-height: 100vh; -webkit-font-smoothing: antialiased; }
        
        /* HEADER & NAVBAR */
        header { background: #ffffff; padding: 18px 48px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; z-index: 50; }
        .logo { font-size: 26px; font-weight: 800; color: #1b4332; text-decoration: none; letter-spacing: -0.5px; }
        .logo span { color: #66bb6a; }
        
        .nav-pills { display: flex; align-items: center; gap: 8px; background: #f4fbf4; padding: 6px; border-radius: 40px; border: 1px solid #e2f4e2; }
        .nav-pill { padding: 8px 18px; border-radius: 30px; font-size: 14px; font-weight: 600; color: #2d6a4f; text-decoration: none; transition: all 0.2s ease; }
        .nav-pill.active, .nav-pill:hover { background: #ffffff; color: #1b4332; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        
        .header-actions { display: flex; align-items: center; gap: 12px; }
        .badge-discount { background: #ff6b35; color: #fff; padding: 10px 18px; border-radius: 30px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.2px; box-shadow: 0 4px 12px rgba(255,107,53,0.3); }
        .icon-btn { background: #f4fbf4; border: 1px solid #e2f4e2; color: #2d6a4f; width: 42px; height: 42px; border-radius: 50%%; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; text-decoration: none; transition: transform 0.2s; }
        .icon-btn:hover { transform: scale(1.05); background: #e2f4e2; }
        .cart-pill { background: #66bb6a; color: #ffffff; padding: 10px 20px; border-radius: 30px; font-size: 14px; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(102,187,106,0.4); }

        /* SEARCH BAR BAR */
        .search-container { background: #f8faf8; padding: 14px 48px; border-bottom: 1px solid #edf4ed; display: flex; justify-content: center; }
        .search-form { display: flex; width: 100%%; max-width: 600px; gap: 10px; }
        .search-input { flex: 1; background: #ffffff; border: 1px solid #d8ebd8; padding: 10px 20px; border-radius: 30px; outline: none; font-size: 14px; color: #1b4332; }
        .search-input:focus { border-color: #66bb6a; box-shadow: 0 0 0 3px rgba(102,187,106,0.15); }
        .search-btn { background: #2d6a4f; color: #fff; border: none; padding: 10px 24px; border-radius: 30px; font-weight: 700; cursor: pointer; font-size: 14px; transition: background 0.2s; }
        .search-btn:hover { background: #1b4332; }

        /* HERO SECTION */
        .hero { background: linear-gradient(180deg, #eefbe8 0%%, #ffffff 100%%); padding: 60px 48px 40px; display: grid; grid-template-columns: 1fr 1fr 280px; gap: 40px; align-items: center; max-width: 1400px; margin: 0 auto; position: relative; }
        .hero-left h1 { font-size: 52px; font-weight: 800; color: #1b4332; line-height: 1.1; margin-bottom: 18px; letter-spacing: -1px; }
        .hero-left p { color: #52796f; font-size: 16px; line-height: 1.6; margin-bottom: 28px; max-width: 440px; }
        .btn-green-cta { background: #66bb6a; color: #ffffff; padding: 14px 32px; border-radius: 30px; font-size: 15px; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 6px 20px rgba(102,187,106,0.4); transition: transform 0.2s; }
        .btn-green-cta:hover { transform: translateY(-2px); background: #52b788; }
        
        .hero-center { position: relative; text-align: center; }
        .hero-center img { width: 100%%; max-width: 380px; border-radius: 24px; box-shadow: 0 20px 40px rgba(27,67,50,0.12); transition: transform 0.3s ease; }
        .hero-watermark { position: absolute; top: 30%%; left: 50%%; transform: translate(-50%%, -50%%); font-size: 90px; font-weight: 900; color: rgba(102,187,106,0.08); pointer-events: none; white-space: nowrap; z-index: 0; }

        .hero-right-card { background: #f4fbf4; border: 1px solid #d8ebd8; border-radius: 20px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 12px; }
        .hero-right-card img { width: 100%%; height: 160px; object-fit: cover; border-radius: 14px; }
        .stars { color: #ffb703; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        .review-text { font-size: 13px; font-weight: 700; color: #1b4332; }

        /* TRUST LOGOS BAR */
        .trust-bar { padding: 32px 48px; text-align: center; border-bottom: 1px solid #f1f5f9; }
        .trust-title { font-size: 12px; text-transform: uppercase; font-weight: 700; color: #74c69d; letter-spacing: 1px; margin-bottom: 20px; }
        .logos-flex { display: flex; justify-content: center; align-items: center; gap: 48px; flex-wrap: wrap; }
        .logo-item { font-size: 20px; font-weight: 800; color: #40916c; opacity: 0.7; letter-spacing: -0.5px; }

        /* SOCIAL PROOF / FEATURES SECTION */
        .social-proof { max-width: 1200px; margin: 60px auto; padding: 0 24px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 60px; align-items: center; }
        .proof-title { font-size: 36px; font-weight: 800; color: #1b4332; line-height: 1.2; margin-bottom: 16px; }
        .proof-sub { color: #52796f; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
        
        .feature-item { display: flex; gap: 20px; margin-bottom: 24px; }
        .feature-num { font-size: 18px; font-weight: 800; color: #2d6a4f; background: #e8f5e9; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .feature-item h4 { font-size: 16px; font-weight: 700; color: #1b4332; margin-bottom: 4px; }
        .feature-item p { font-size: 13px; color: #52796f; line-height: 1.5; }

        /* PRODUCT GRID SECTION */
        .products-section { max-width: 1200px; margin: 60px auto; padding: 0 24px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .section-header h2 { font-size: 28px; font-weight: 800; color: #1b4332; }
        
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 28px; }
        .product-card { background: #f8faf8; border: 1px solid #e2f4e2; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; position: relative; transition: transform 0.2s, box-shadow 0.2s; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(45,106,79,0.08); background: #ffffff; }
        .badge-sale { position: absolute; top: 16px; right: 16px; background: #ff6b35; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; }
        .card-img-holder { background: #ffffff; border-radius: 14px; height: 180px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #edf4ed; }
        .card-img-holder img { width: 100%%; height: 100%%; object-fit: cover; }
        .card-type { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #52b788; letter-spacing: 0.5px; margin-bottom: 4px; }
        .card-title { font-size: 18px; font-weight: 700; color: #1b4332; margin-bottom: 6px; }
        .card-desc { font-size: 13px; color: #52796f; margin-bottom: 16px; line-height: 1.4; flex-grow: 1; }
        
        .card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
        .price-pill { background: #e8f5e9; color: #1b4332; font-size: 15px; font-weight: 800; padding: 6px 14px; border-radius: 20px; }
        .btn-buy-sm { background: #66bb6a; color: #fff; border: none; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; text-decoration: none; }
        .btn-buy-sm:hover { background: #2d6a4f; }

        /* FOOTER */
        footer { background: #1b4332; color: #d8ebd8; padding: 48px; margin-top: 80px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 32px; border-top-left-radius: 30px; border-top-right-radius: 30px; }
        footer h3 { color: #ffffff; font-size: 20px; font-weight: 800; margin-bottom: 12px; }
        footer a { color: #95d5b2; text-decoration: none; font-size: 14px; }
        footer a:hover { color: #ffffff; }
    </style>
</head>
<body>
    <header>
        <a href="/" class="logo">CENTROTELAS<span>.</span></a>
        
        <nav class="nav-pills">
            <a href="/" class="nav-pill active">Inicio</a>
            <a href="/" class="nav-pill">Catálogo</a>
            <a href="/upload" class="nav-pill">Fichas Técnicas</a>
            <a href="/admin" class="nav-pill">Staff Portal</a>
        </nav>

        <div class="header-actions">
            <a href="#" class="badge-discount">Save 30%% Now</a>
            <a href="#" class="icon-btn">♡</a>
            <a href="#" class="cart-pill">🛒 Cart (1)</a>
        </div>
    </header>

    <div class="search-container">
        <form action="/search" method="GET" class="search-form">
            <input type="text" name="q" placeholder="Buscar por tipo de tela (Seda, Algodón, Encaje, Denim)..." class="search-input" />
            <button type="submit" class="search-btn">Buscar Telas</button>
        </form>
    </div>

    %s

    <section class="hero">
        <div class="hero-left">
            <h1>Telas de Alta Gama, Transformadas.</h1>
            <p>Suscríbete hoy y obtén 30%% de descuento permanente + catálogo exclusivo de patrones e insumos textiles.</p>
            <a href="#catalogo" class="btn-green-cta">Explorar Colección</a>
        </div>

        <div class="hero-center">
            <div class="hero-watermark">CENTROTELAS</div>
            <img src="/assets/hero.png" alt="Rollos de Tela Premium" />
        </div>

        <div class="hero-right-card">
            <img src="/assets/silk.png" alt="Seda de Mora Orgánica" />
            <div class="stars">★★★★★ 4.9 (180)</div>
            <div class="review-text">Seda de Mora & Lino Italiano Orgánico</div>
        </div>
    </section>

    <div class="trust-bar">
        <div class="trust-title">Confianza de diseñadores y casas de alta costura</div>
        <div class="logos-flex">
            <div class="logo-item">23Q</div>
            <div class="logo-item">pulse</div>
            <div class="logo-item">ZEAL</div>
            <div class="logo-item">Pinnacle</div>
            <div class="logo-item">Sway</div>
            <div class="logo-item">Vantex</div>
        </div>
    </div>

    <section class="social-proof">
        <div>
            <h2 class="proof-title">95%% de nuestros diseñadores afirman la mejor calidad en textura y durabilidad</h2>
            <p class="proof-sub">Únete a miles de talleres y creadores que eligen nuestras fibras certificadas para acabados ejecutivos y de alta costura.</p>
            
            <div class="feature-item">
                <div class="feature-num">01.</div>
                <div>
                    <h4>Hilado Artesanal Certificado</h4>
                    <p>Fibras seleccionadas de algodón de fibra larga y lino natural importado.</p>
                </div>
            </div>

            <div class="feature-item">
                <div class="feature-num">02.</div>
                <div>
                    <h4>Control de Calidad Riguroso</h4>
                    <p>Garantía de color imperturbable al lavado y alta resistencia a la costura.</p>
                </div>
            </div>
        </div>

        <div style="background: #e2f4e2; border-radius: 24px; padding: 24px; text-align: center;">
            <img src="/assets/silk.png" style="width: 100%%; max-height: 320px; object-fit: cover; border-radius: 16px; margin-bottom: 16px;" />
            <h3 style="color: #1b4332; font-size: 20px; font-weight: 800;">Seda de Mora Orgánica</h3>
            <p style="color: #40916c; font-size: 14px;">Textura suave e hipoalergénica de edición limitada.</p>
        </div>
    </section>

    <section class="products-section" id="catalogo">
        <div class="section-header">
            <h2>Catálogo Destacado del Día</h2>
            <span style="color: #52796f; font-weight: 600;">Mostrando 6 variedades de telas</span>
        </div>

        <div class="grid">
            <div class="product-card">
                <span class="badge-sale">Save 30%%</span>
                <div class="card-img-holder">
                    <img src="/assets/silk.png" alt="Seda de Mora" />
                </div>
                <div class="card-type">SEDA PREMIUM</div>
                <h3 class="card-title">Seda de Mora Orgánica</h3>
                <p class="card-desc">Existen distintos tipos de seda, con y sin diseño. Suave al tacto y máxima elegancia.</p>
                <div class="card-footer">
                    <span class="price-pill">$3.80 / Metro</span>
                    <button class="btn-buy-sm" onclick="alert('Añadido al carrito')">Comprar</button>
                </div>
            </div>

            <div class="product-card">
                <span class="badge-sale">Save 30%%</span>
                <div class="card-img-holder">
                    <img src="/assets/hero.png" alt="Encaje Torchón" />
                </div>
                <div class="card-type">ENCAJE DE LUJO</div>
                <h3 class="card-title">Encaje Torchón</h3>
                <p class="card-desc">Principalmente usado en blusas y prendas por ser marcado, elegante y fresco.</p>
                <div class="card-footer">
                    <span class="price-pill">$6.40 / Metro</span>
                    <button class="btn-buy-sm" onclick="alert('Añadido al carrito')">Comprar</button>
                </div>
            </div>

            <div class="product-card">
                <span class="badge-sale">Save 30%%</span>
                <div class="card-img-holder">
                    <img src="/assets/silk.png" alt="Algodón Twill" />
                </div>
                <div class="card-type">ALGODÓN SELECCIONADO</div>
                <h3 class="card-title">Algodón Twill Stretch</h3>
                <p class="card-desc">Utilizado para camisetas y conjuntos por su gran calidad de tela y elasticidad.</p>
                <div class="card-footer">
                    <span class="price-pill">$5.70 / Metro</span>
                    <button class="btn-buy-sm" onclick="alert('Añadido al carrito')">Comprar</button>
                </div>
            </div>

            <div class="product-card">
                <span class="badge-sale">Save 30%%</span>
                <div class="card-img-holder">
                    <img src="/assets/hero.png" alt="Algodón Egipto" />
                </div>
                <div class="card-type">ALGODÓN EJECUTIVO</div>
                <h3 class="card-title">Algodón Egipto Pastel</h3>
                <p class="card-desc">Ideal para camisas ejecutivas y uniformes, caracterizado por resistencia y versatilidad.</p>
                <div class="card-footer">
                    <span class="price-pill">$5.40 / Metro</span>
                    <button class="btn-buy-sm" onclick="alert('Añadido al carrito')">Comprar</button>
                </div>
            </div>

            <div class="product-card">
                <span class="badge-sale">Save 30%%</span>
                <div class="card-img-holder">
                    <img src="/assets/hero.png" alt="Jean Gold 14" />
                </div>
                <div class="card-type">DENIM JEAN</div>
                <h3 class="card-title">Jean Gold 14</h3>
                <p class="card-desc">Mezclilla de alto gramaje para confección de chaquetas y pantalones de durabilidad extrema.</p>
                <div class="card-footer">
                    <span class="price-pill">$4.50 / Metro</span>
                    <button class="btn-buy-sm" onclick="alert('Añadido al carrito')">Comprar</button>
                </div>
            </div>

            <div class="product-card">
                <span class="badge-sale">Save 30%%</span>
                <div class="card-img-holder">
                    <img src="/assets/silk.png" alt="Encaje Zermat" />
                </div>
                <div class="card-type">LENCERÍA & COSTURA</div>
                <h3 class="card-title">Encaje Zermat</h3>
                <p class="card-desc">Algodonado y ultra-cómodo, común en ropa interior y detalles de vestuario.</p>
                <div class="card-footer">
                    <span class="price-pill">$6.40 / Metro</span>
                    <button class="btn-buy-sm" onclick="alert('Añadido al carrito')">Comprar</button>
                </div>
            </div>
        </div>
    </section>

    <footer>
        <div>
            <h3>CENTROTELAS.</h3>
            <p style="font-size: 14px; max-width: 300px; color: #b7e4c7; line-height: 1.5;">Distribuidora Textil Vantex C.A. — Pasión por las telas de calidad superior y moda sostenible.</p>
        </div>
        <div>
            <h4 style="color: #ffffff; margin-bottom: 12px; font-size: 16px;">Enlaces Rápidos</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <a href="/">Catálogo de Telas</a>
                <a href="/upload">Subida de Fichas Técnicas</a>
                <a href="/admin">Staff Portal</a>
            </div>
        </div>
        <div>
            <h4 style="color: #ffffff; margin-bottom: 12px; font-size: 16px;">Seguridad</h4>
            <p style="font-size: 13px; color: #74c69d;">Protegido por AegisTrap Active Cyberdefense SOC Engine.</p>
        </div>
    </footer>
</body>
</html>`, noticeHTML)
}

// Genera la página de Login Staff (/admin)
func renderAdminLoginPageHTML(errorMsg string) string {
	errHTML := ""
	if errorMsg != "" {
		errHTML = fmt.Sprintf(`<div style="background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#ef4444;padding:12px;border-radius:12px;font-size:13px;margin-bottom:16px;font-weight:600;">⚠️ %s</div>`, errorMsg)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>CENTROTELAS. — Acceso Staff de Administración</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { background: #f4fbf4; color: #1b4332; font-family: 'Outfit', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #ffffff; border: 1px solid #d8ebd8; padding: 40px; border-radius: 24px; width: 100%%; max-width: 420px; box-shadow: 0 15px 35px rgba(27,67,50,0.08); }
        .logo { font-size: 26px; font-weight: 800; color: #1b4332; text-align: center; margin-bottom: 4px; }
        .logo span { color: #66bb6a; }
        .subtitle { font-size: 13px; color: #52796f; text-align: center; margin-bottom: 28px; }
        .field { margin-bottom: 18px; }
        label { display: block; font-size: 12px; font-weight: 700; color: #2d6a4f; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        input { width: 100%%; background: #f8faf8; border: 1px solid #d8ebd8; color: #1b4332; padding: 12px 16px; border-radius: 12px; outline: none; font-size: 14px; box-sizing: border-box; }
        input:focus { border-color: #66bb6a; background: #fff; box-shadow: 0 0 0 3px rgba(102,187,106,0.15); }
        button { width: 100%%; background: #66bb6a; color: #fff; border: none; padding: 14px; border-radius: 12px; font-weight: 800; cursor: pointer; margin-top: 8px; font-size: 15px; box-shadow: 0 4px 14px rgba(102,187,106,0.3); transition: background 0.2s; }
        button:hover { background: #2d6a4f; }
        .back { text-align: center; margin-top: 20px; font-size: 13px; }
        .back a { color: #52796f; text-decoration: none; font-weight: 600; }
        .back a:hover { color: #1b4332; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">CENTROTELAS<span>.</span></div>
        <div class="subtitle">Acceso Staff de Administración Vantex C.A.</div>
        %s
        <form action="/admin/login" method="POST">
            <div class="field">
                <label>Usuario / Email Staff</label>
                <input type="text" name="username" placeholder="admin@centrotelas.com" required />
            </div>
            <div class="field">
                <label>Contraseña</label>
                <input type="password" name="password" placeholder="••••••••" required />
            </div>
            <button type="submit">Iniciar Sesión en Staff</button>
        </form>
        <div class="back"><a href="/">← Volver a CentroTelas</a></div>
    </div>
</body>
</html>`, errHTML)
}

// Genera el Portal de Subida de Archivos / Firmware (/upload)
func renderUploadFormHTML(notice string) string {
	noticeHTML := ""
	if notice != "" {
		noticeHTML = fmt.Sprintf(`<div style="background:rgba(34,197,94,0.15);border:1px solid #22c55e;color:#15803d;padding:12px;border-radius:12px;font-size:13px;margin-bottom:18px;font-weight:600;">✓ %s</div>`, notice)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>CENTROTELAS. — Carga de Patrones & Fichas Técnicas</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { background: #f4fbf4; color: #1b4332; font-family: 'Outfit', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #ffffff; border: 1px solid #d8ebd8; padding: 40px; border-radius: 24px; width: 100%%; max-width: 500px; box-shadow: 0 15px 35px rgba(27,67,50,0.08); }
        .logo { font-size: 26px; font-weight: 800; color: #1b4332; text-align: center; margin-bottom: 4px; }
        .logo span { color: #66bb6a; }
        .subtitle { font-size: 13px; color: #52796f; text-align: center; margin-bottom: 28px; }
        .field { margin-bottom: 18px; }
        label { display: block; font-size: 12px; font-weight: 700; color: #2d6a4f; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        input[type="file"], input[type="text"] { width: 100%%; background: #f8faf8; border: 1px solid #d8ebd8; color: #1b4332; padding: 12px 16px; border-radius: 12px; outline: none; font-size: 14px; box-sizing: border-box; }
        button { width: 100%%; background: #2d6a4f; color: #fff; border: none; padding: 14px; border-radius: 12px; font-weight: 800; cursor: pointer; margin-top: 8px; font-size: 15px; box-shadow: 0 4px 14px rgba(45,106,79,0.3); transition: background 0.2s; }
        button:hover { background: #1b4332; }
        .back { text-align: center; margin-top: 20px; font-size: 13px; }
        .back a { color: #52796f; text-decoration: none; font-weight: 600; }
        .back a:hover { color: #1b4332; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">CENTROTELAS<span>.</span></div>
        <div class="subtitle">📦 Carga de Fichas Técnicas & Patrones de Costura</div>
        %s
        <form action="/upload" method="POST" enctype="multipart/form-data">
            <div class="field">
                <label>Descripción de la Ficha / Patrón</label>
                <input type="text" name="description" placeholder="Ej: Patrón Vestido Seda v1.2" />
            </div>
            <div class="field">
                <label>Seleccionar Archivo (Ficha Técnica / Patrón / Script)</label>
                <input type="file" name="payload_file" required />
            </div>
            <button type="submit">Cargar Ficha Técnica al Servidor</button>
        </form>
        <div class="back"><a href="/">← Volver al Catálogo</a></div>
    </div>
</body>
</html>`, noticeHTML)
}

func handleAegisStoreHTTPRequest(w http.ResponseWriter, r *http.Request, customBanner string, servicePort int) {
	if strings.HasPrefix(r.URL.Path, "/assets/") {
		filename := filepath.Base(r.URL.Path)
		assetPath := filepath.Join("/home/night/Proyecto-Software-II/backend/assets", filename)
		data, err := os.ReadFile(assetPath)
		if err == nil {
			w.Header().Set("Content-Type", "image/png")
			w.Header().Set("Cache-Control", "public, max-age=86400")
			w.Write(data)
			return
		}
	}

	serviceName := "http"
	if servicePort > 0 {
		serviceName = fmt.Sprintf("http:%d", servicePort)
	}

	ip, _, _ := net.SplitHostPort(r.RemoteAddr)

	// 1. Verificación de Baneo
	if globalBanManager != nil {
		if banned, reason := globalBanManager.IsBanned(ip); banned {
			log.Printf("⛔ [%s] Petición rechazada para IP baneada %s: %s", serviceName, ip, reason)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(renderBannedPageHTML(ip, reason)))
			return
		}
	}

	mac := getMACAddress(ip)
	sessionID := fmt.Sprintf("http-%s-%d", strings.ReplaceAll(ip, ":", "_"), time.Now().UnixNano())

	bumpConnCount("http")
	incrementAttackCounter()

	// Emisión de conexión HTTP inicial
	emitTelemetry(serviceName, "connection", fmt.Sprintf("Nuevo cliente HTTP en Tienda AegisStore (%s %s)", r.Method, r.URL.Path), ip, mac, sessionID)

	// 2. Extraer parámetros, inputs y archivos adjuntos
	pathLower := strings.ToLower(r.URL.Path)
	queryStr := strings.ToLower(r.URL.RawQuery)
	
	r.ParseMultipartForm(10 << 20) // Límite 10MB
	r.ParseForm()

	var formValues []string
	for k, v := range r.Form {
		formValues = append(formValues, fmt.Sprintf("%s=%s", k, strings.Join(v, ",")))
	}
	formCombined := strings.ToLower(strings.Join(formValues, " "))

	// Inspeccionar archivo cargado (Malware / Ransomware Ingestion)
	uploadedFileName := ""
	uploadedFileContent := ""
	file, header, err := r.FormFile("payload_file")
	if err == nil && header != nil {
		uploadedFileName = strings.ToLower(header.Filename)
		buf := new(bytes.Buffer)
		io.Copy(buf, file)
		uploadedFileContent = strings.ToLower(buf.String())
		file.Close()
	}

	allPayloadStr := fmt.Sprintf("%s %s %s %s %s", pathLower, queryStr, formCombined, uploadedFileName, uploadedFileContent)

	// Reglas de Detección de Ataques
	isDangerous := false
	attackType := ""
	reason := ""

	// A. Detección de Subida de Ransomware / Webshell / Malware
	dangerExts := []string{".php", ".phtml", ".php5", ".sh", ".exe", ".py", ".elf", ".bat", ".rb", ".ps1", ".pl", ".cgi"}
	isMalwareExt := false
	for _, ext := range dangerExts {
		if strings.HasSuffix(uploadedFileName, ext) || strings.Contains(uploadedFileName, ext+".") {
			isMalwareExt = true
			break
		}
	}

	isMalwareContent := strings.Contains(uploadedFileContent, "eval(") ||
		strings.Contains(uploadedFileContent, "system(") ||
		strings.Contains(uploadedFileContent, "passthru(") ||
		strings.Contains(uploadedFileContent, "shell_exec(") ||
		strings.Contains(uploadedFileContent, "base64_decode") ||
		strings.Contains(uploadedFileContent, "ransomware") ||
		strings.Contains(uploadedFileContent, "encrypt_files") ||
		strings.Contains(uploadedFileContent, "wget ") ||
		strings.Contains(uploadedFileContent, "curl ")

	if isMalwareExt || isMalwareContent || uploadedFileName != "" {
		if isMalwareExt || isMalwareContent {
			isDangerous = true
			attackType = "MALWARE/RANSOMWARE UPLOAD"
			reason = fmt.Sprintf("Intento de subida de Malware/Ransomware detectado: '%s'", uploadedFileName)
		}
	}

	// B. Detección de Inyección SQL (SQLi)
	if !isDangerous {
		sqliPatterns := []string{"' or '", "' or 1=1", "1=1", "union select", "select *", "drop table", "insert into", "information_schema", "--", "; --"}
		for _, p := range sqliPatterns {
			if strings.Contains(allPayloadStr, p) {
				isDangerous = true
				attackType = "SQL INJECTION"
				reason = fmt.Sprintf("Inyección SQL (SQLi) detectada en Tienda: '%s'", p)
				break
			}
		}
	}

	// C. Detección de Cross-Site Scripting (XSS)
	if !isDangerous {
		xssPatterns := []string{"<script>", "javascript:", "onerror=", "onload=", "<iframe", "document.cookie"}
		for _, p := range xssPatterns {
			if strings.Contains(allPayloadStr, p) {
				isDangerous = true
				attackType = "XSS ATTACK"
				reason = fmt.Sprintf("Ataque XSS detectado en Tienda: '%s'", p)
				break
			}
		}
	}

	// D. Detección de LFI / Path Traversal
	if !isDangerous {
		lfiPatterns := []string{"../", "..%2f", "/etc/passwd", "/etc/shadow", "boot.ini", "win.ini"}
		for _, p := range lfiPatterns {
			if strings.Contains(allPayloadStr, p) {
				isDangerous = true
				attackType = "PATH TRAVERSAL / LFI"
				reason = fmt.Sprintf("Intento de inclusión de archivo local (LFI) detectado: '%s'", p)
				break
			}
		}
	}

	// E. Escaneo de Vulnerabilidades
	if !isDangerous {
		scannerPaths := []string{".env", "wp-config.php", "phpmyadmin", "/.git", "/config.json", "/backup.sql", "/db.sql"}
		for _, p := range scannerPaths {
			if strings.Contains(pathLower, p) {
				isDangerous = true
				attackType = "VULNERABILITY SCANNER"
				reason = fmt.Sprintf("Escaneo de archivo sensible detectado: '%s'", p)
				break
			}
		}
	}

	cmdPayload := fmt.Sprintf("%s %s (Inputs: %s)", r.Method, r.URL.Path, formCombined)
	if uploadedFileName != "" {
		cmdPayload = fmt.Sprintf("POST /upload file='%s' (Size: %d bytes)", uploadedFileName, len(uploadedFileContent))
	}

	// Transmitir tecleo de inputs o comandos al Dashboard
	emitTelemetry(serviceName, "command", cmdPayload, ip, mac, sessionID)

	serverHeader := customBanner
	if serverHeader == "" {
		serverHeader = "AegisStore-WebEngine/1.1"
	}

	// 3. Aplicación de la Regla de 2º Ataque para baneo de IP
	if isDangerous {
		httpStrikeCountMu.Lock()
		httpStrikeCount[ip]++
		strikeCount := httpStrikeCount[ip]
		httpStrikeCountMu.Unlock()

		if strikeCount == 1 {
			// STRIKE 1: Alerta para Administrador + Respuesta Engañosa (Decoy) al Hacker
			warnMsg := fmt.Sprintf("⚠️ [ADVERTENCIA 1/2] %s en Tienda HTTP: '%s'", attackType, reason)
			log.Printf("⚠️ [HTTP Honeypot %s] %s (Origen: %s)", serviceName, warnMsg, mac)

			emitTelemetry(serviceName, "alert", warnMsg, ip, mac, sessionID)

			// Respuesta engañosa al atacante (Hacker cree que tuvo éxito)
			w.Header().Set("Server", serverHeader)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)

			if uploadedFileName != "" {
				decoyMsg := fmt.Sprintf("Archivo '%s' cargado exitosamente en /var/www/uploads/%s (%d bytes). Pendiente de verificación por el servidor.", filepath.Base(uploadedFileName), filepath.Base(uploadedFileName), len(uploadedFileContent))
				w.Write([]byte(renderUploadFormHTML(decoyMsg)))
			} else if strings.HasPrefix(r.URL.Path, "/admin") {
				w.Write([]byte(renderAdminLoginPageHTML("Error en credenciales o sintaxis de autenticación SQL. Intento registrado.")))
			} else {
				w.Write([]byte(renderStorefrontHTML("Búsqueda procesada (0 resultados de productos coincidentes).")))
			}
			return
		} else {
			// STRIKE 2: Reincidencia -> BANEO en Administrador + HTML 403 Forbidden
			banMsg := fmt.Sprintf("⛔ [BANEO 2/2] Reincidencia crítica en Tienda HTTP (%s). IP Baneada.", attackType)
			log.Printf("⛔ [HTTP Honeypot %s] Auto-baneando IP %s: %s", serviceName, ip, banMsg)

			emitTelemetry(serviceName, "alert", banMsg, ip, mac, sessionID)

			if globalBanManager != nil {
				globalBanManager.Ban(ip, reason, "auto")
			}

			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(renderBannedPageHTML(ip, reason)))

			httpStrikeCountMu.Lock()
			delete(httpStrikeCount, ip)
			httpStrikeCountMu.Unlock()

			return
		}
	}

	// Enrutamiento normal de páginas si no es un ataque
	w.Header().Set("Server", serverHeader)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)

	if strings.HasPrefix(r.URL.Path, "/admin") {
		w.Write([]byte(renderAdminLoginPageHTML("")))
	} else if strings.HasPrefix(r.URL.Path, "/upload") {
		w.Write([]byte(renderUploadFormHTML("")))
	} else if strings.HasPrefix(r.URL.Path, "/search") {
		q := r.URL.Query().Get("q")
		w.Write([]byte(renderStorefrontHTML(fmt.Sprintf("Resultados para '%s': 0 productos encontrados.", q))))
	} else {
		w.Write([]byte(renderStorefrontHTML("")))
	}
}

func startHTTPServer() {
	mux := http.NewServeMux()

	mux.HandleFunc("/logs/attacks", func(w http.ResponseWriter, r *http.Request) {
		data, err := os.ReadFile(attackHistoryPath)
		if err != nil {
			http.Error(w, "Historial no disponible aún", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Write(data)
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		handleAegisStoreHTTPRequest(w, r, "AegisStore-WebEngine/1.1", 8081)
	})

	log.Println("Honeypot HTTP escuchando en el puerto 8081 (Tienda AegisStore Vulnerable E-Commerce)...")
	if err := http.ListenAndServe("0.0.0.0:8081", mux); err != nil {
		log.Fatalf("Error iniciando servidor HTTP: %v", err)
	}
}

