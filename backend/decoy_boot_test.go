package main

import (
	"os"
	"path/filepath"
	"testing"
)

// Check mínimo: go test ./...

func TestResolveCdJail(t *testing.T) {
	home := decoyAbs()
	cwd := home

	// cd relativo dentro del señuelo
	target, ok := resolveCd(cwd, "Documents")
	if !ok || target != filepath.Join(home, "Documents") {
		t.Fatalf("cd Documents: ok=%v target=%s", ok, target)
	}

	// subida con .. dentro del señuelo
	target, ok = resolveCd(filepath.Join(home, "Documents"), "..")
	if !ok || target != home {
		t.Fatalf("cd .. dentro del señuelo: ok=%v target=%s", ok, target)
	}

	// ESCAPE: ../../../.. debe aterrizar en la raíz del señuelo (redirect, no error)
	target, ok = resolveCd(filepath.Join(home, "Documents"), "../../../..")
	if !ok || target != home {
		t.Fatalf("escape ../../.. debe redirigir a la raíz: ok=%v target=%s", ok, target)
	}

	// cd / (root real) → redirect a la raíz del señuelo
	target, ok = resolveCd(filepath.Join(home, "projects"), "/")
	if !ok || target != home {
		t.Fatalf("cd / debe redirigir a la raíz señuelo: ok=%v target=%s", ok, target)
	}

	// /etc → redirect, no "No such file"
	target, ok = resolveCd(home, "/etc")
	if !ok || target != home {
		t.Fatalf("cd /etc debe redirigir (no error): ok=%v target=%s", ok, target)
	}

	// ~ y vacío → home
	if target, ok = resolveCd(home, "~"); !ok || target != home {
		t.Fatalf("cd ~ falló")
	}
	if target, ok = resolveCd(home, ""); !ok || target != home {
		t.Fatalf("cd sin args falló")
	}

	// inexistente dentro del señuelo → error
	if _, ok = resolveCd(home, "no_existe_xyz"); ok {
		t.Fatal("cd a carpeta inexistente no debe resolver")
	}
}

func TestDecoyPermsNoCreation(t *testing.T) {
	// Semántica "leer/editar sí, crear no" provista por el kernel (la base del gate):
	// dirs 0555 → crear archivo/mkdir denegado; archivos 0644 → escribir EXISTENTE ok.
	// Se prueba sobre t.TempDir (ext4 real) — no sobre decoy_home, porque en /mnt/c
	// (DrvFs) chmod es casi un no-op y el test daría falsos resultados.
	if os.Geteuid() == 0 {
		t.Skip("corriendo como root: el kernel ignora los permisos")
	}
	dir := t.TempDir()
	defer os.Chmod(dir, 0755) // restaurar para que el cleanup de TempDir borre

	// El archivo señuelo existe ANTES del chmod walk (como ensureDecoy lo hace)
	f := filepath.Join(dir, "notas.txt")
	if err := os.WriteFile(f, []byte("original"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := os.Chmod(dir, 0555); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Create(filepath.Join(dir, "atacante.txt")); err == nil {
		t.Fatal("crear archivo en dir 0555 debía ser denegado")
	}
	if err := os.Mkdir(filepath.Join(dir, "junk"), 0755); err == nil {
		t.Fatal("mkdir en dir 0555 debía ser denegado")
	}

	if err := os.WriteFile(f, []byte("editado"), 0644); err != nil {
		t.Fatalf("modificar archivo EXISTENTE debía ser permitido: %v", err)
	}
}
