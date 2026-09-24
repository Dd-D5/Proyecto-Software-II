package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const sessionsFilePath = "sessions.json"

type SessionStore struct {
	mu       sync.RWMutex
	tokens   map[string]time.Time
	passHash string
}

var globalAuth *SessionStore

func initAuth(defaultPassword string) *SessionStore {
	hash, err := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
	if err != nil {
		hash = []byte(defaultPassword) // Fallback si falla bcrypt
	}

	store := &SessionStore{
		tokens:   make(map[string]time.Time),
		passHash: string(hash),
	}
	store.loadSessions()
	globalAuth = store
	return store
}

func (s *SessionStore) loadSessions() {
	data, err := os.ReadFile(sessionsFilePath)
	if err != nil {
		return
	}
	var loaded map[string]time.Time
	if err := json.Unmarshal(data, &loaded); err == nil {
		s.mu.Lock()
		now := time.Now()
		for tok, exp := range loaded {
			if exp.After(now) {
				s.tokens[tok] = exp
			}
		}
		s.mu.Unlock()
	}
}

func (s *SessionStore) saveSessions() {
	s.mu.RLock()
	defer s.mu.RUnlock()
	data, err := json.Marshal(s.tokens)
	if err == nil {
		_ = os.WriteFile(sessionsFilePath, data, 0644)
	}
}

func (s *SessionStore) VerifyPassword(password string) bool {
	sanitized := SanitizeInput(password)
	err := bcrypt.CompareHashAndPassword([]byte(s.passHash), []byte(sanitized))
	return err == nil
}

func (s *SessionStore) CreateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	token := hex.EncodeToString(b)

	s.mu.Lock()
	s.tokens[token] = time.Now().Add(24 * time.Hour)
	s.mu.Unlock()

	s.saveSessions()
	return token
}

func (s *SessionStore) ValidateToken(token string) bool {
	if token == "" {
		return false
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	exp, exists := s.tokens[token]
	if !exists {
		return false
	}
	if time.Now().After(exp) {
		return false
	}
	return true
}

func (s *SessionStore) RevokeToken(token string) {
	s.mu.Lock()
	delete(s.tokens, token)
	s.mu.Unlock()
	s.saveSessions()
}

// SanitizeInput remueve o neutraliza patrones peligrosos de Inyección SQL, XSS y Comandos
func SanitizeInput(input string) string {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return ""
	}

	// 1. Limpieza de caracteres de escape nulos y de control inapropiados
	cleaned := strings.ReplaceAll(trimmed, "\x00", "")

	// 2. Filtros de inyección SQL comunes
	sqlPatterns := regexp.MustCompile(`(?i)(UNION\s+SELECT|SELECT\s+.*\s+FROM|INSERT\s+INTO|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|' OR '1'='1|--|\/\*|\*\/)`)
	cleaned = sqlPatterns.ReplaceAllString(cleaned, "[SANEADO]")

	// 3. Filtros XSS básicos
	xssPatterns := regexp.MustCompile(`(?i)(<script.*?>|javascript:|onload=|onerror=)`)
	cleaned = xssPatterns.ReplaceAllString(cleaned, "[XSS_SANEADO]")

	return cleaned
}

// AuthMiddleware asegura que las peticiones a la API REST contengan un Token Bearer válido
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Permitir OPTIONS preflight para CORS
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
			w.WriteHeader(http.StatusOK)
			return
		}

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")

		authHeader := r.Header.Get("Authorization")
		token := ""
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			token = r.URL.Query().Get("token")
		}

		if globalAuth == nil || !globalAuth.ValidateToken(token) {
			http.Error(w, `{"error":"No autorizado. Token de sesión inválido o expirado."}`, http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}
