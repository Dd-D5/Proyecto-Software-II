package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Filesystem señuelo REAL: el RCE del fake shell ejecuta sobre esta carpeta en
// vez de sobre la del backend. El kernel hace de portero:
//   - directorios 0555 (r-x) → touch/mkdir/cp/mv/rm fallan con "Permission denied"
//   - archivos 0644 (rw-)  → cat/echo >>/editores pueden leer y MODIFICAR
// La creación queda imposible sin una sola línea de simulación: los errores
// son los auténticos del kernel.

var decoyHomePath = filepath.Join("decoy_home")

// displayHome es la ruta de fantasía que ve el atacante (pwd/prompt).
const displayHome = "/home/developer"

func decoyAbs() string {
	abs, err := filepath.Abs(decoyHomePath)
	if err != nil {
		return decoyHomePath
	}
	return abs
}

// ensureDecoy arranca el señuelo: crea la carpeta mínima si falta y aplica el
// walk de permisos en CADA arranque (los edits del atacante persisten entre
// sesiones hasta reinicio/git checkout; el chmod re-aplica la cárcel siempre).
// ponytail: mutaciones del atacante NO se revierten (solo re-chmod). Upgrade
// path: regenerar contenido desde git o copia tmp por sesión.
func ensureDecoy() {
	base := decoyAbs()
	_ = os.MkdirAll(base, 0755)
	// Archivos núcleo si el repo se clonó sin decoy_home
	if _, err := os.Stat(filepath.Join(base, "README.txt")); os.IsNotExist(err) {
		_ = os.WriteFile(filepath.Join(base, "README.txt"),
			[]byte("Servidor de desarrollo interno — NO COMPARTIR con terceros.\n"), 0644)
	}
	_ = filepath.Walk(base, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // señuelo incompleto no tumba el daemon
		}
		if info.IsDir() {
			return os.Chmod(path, 0555)
		}
		return os.Chmod(path, 0644)
	})
}

// resolveCd aplica la semántica del jail:
//   - dentro del señuelo y existe (dir) → navega
//   - dentro pero no existe → (false) → "No such file or directory"
//   - apunta FUERA (/, /etc, ../../..) → redirect silencioso a la raíz señuelo
func resolveCd(cwd, arg string) (string, bool) {
	home := decoyAbs()
	if arg == "" || arg == "~" || arg == "-" {
		return home, true
	}
	var target string
	if filepath.IsAbs(arg) {
		target = filepath.Clean(arg)
	} else {
		target = filepath.Clean(filepath.Join(cwd, arg))
	}
	if !withinDecoy(target) {
		return home, true // cárcel: aterriza en el señuelo, sin error
	}
	info, err := os.Stat(target)
	if err != nil {
		return "", false
	}
	if !info.IsDir() {
		return "", false // "Not a directory" — reusa el mismo mensaje de no-existente
	}
	return target, true
}

func withinDecoy(p string) bool {
	rel, err := filepath.Rel(decoyAbs(), p)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

// displayPath traduce la ruta real del señuelo a la de fantasía: ~/Documents
func displayPath(cwd string) string {
	home := decoyAbs()
	if cwd == home {
		return "~"
	}
	if strings.HasPrefix(cwd, home+string(filepath.Separator)) {
		return "~" + strings.TrimPrefix(cwd, home)
	}
	// Fuera del señuelo no debería verse, pero por si acaso: opaco
	return displayHome
}

// shellPrompt genera "root@<banner>:<cwd># " con cwd de fantasía.
// Sin banner → "ubuntu" (persona histórica).
func shellPrompt(banner, cwd string) string {
	host := strings.TrimSpace(banner)
	if host == "" {
		host = "ubuntu"
	}
	return fmt.Sprintf("root@%s:%s# ", host, displayPath(cwd))
}
