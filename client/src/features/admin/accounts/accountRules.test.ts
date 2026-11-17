import { describe, expect, it } from "vitest";
import { ROLE_LABELS, STAFF_ROLES, roleChoices, validateAccount } from "./accountRules";

const valid = {
  firstName: "Sami",
  lastName: "Benali",
  email: "sami@dropzone.dz",
  phone: "",
  role: "seller" as const,
  password: "motdepasse-provisoire",
};

describe("validateAccount", () => {
  it("accepte un compte complet, sans téléphone", () => {
    const result = validateAccount(valid);
    expect(result).toEqual({ ok: true, value: { firstName: "Sami", lastName: "Benali", email: "sami@dropzone.dz", role: "seller", password: "motdepasse-provisoire" } });
  });

  it("retire les espaces autour du nom et de l'email, et garde le téléphone nettoyé", () => {
    const result = validateAccount({ ...valid, firstName: "  Sami ", email: " Sami@Dropzone.dz ", phone: "0555 12 34 56" });
    expect(result).toMatchObject({ ok: true, value: { firstName: "Sami", email: "Sami@Dropzone.dz", phone: "0555123456" } });
  });

  it("refuse un prénom ou un nom trop court", () => {
    const result = validateAccount({ ...valid, firstName: "S", lastName: " " });
    expect(result).toMatchObject({ ok: false, errors: { firstName: expect.any(String), lastName: expect.any(String) } });
  });

  it("refuse un email sans @ ou sans domaine", () => {
    for (const email of ["", "sami", "sami@dropzone", "sami dropzone@x.dz"]) {
      expect(validateAccount({ ...valid, email }), email).toMatchObject({ ok: false, errors: { email: expect.any(String) } });
    }
  });

  it("refuse un téléphone qui n'est pas un numéro algérien, mais le laisse facultatif", () => {
    expect(validateAccount({ ...valid, phone: "12345" })).toMatchObject({ ok: false, errors: { phone: expect.any(String) } });
    expect(validateAccount({ ...valid, phone: "" })).toMatchObject({ ok: true });
  });

  it("refuse un mot de passe de 7 caractères ou de 73, accepte 8 et 72", () => {
    expect(validateAccount({ ...valid, password: "1234567" })).toMatchObject({ ok: false, errors: { password: expect.any(String) } });
    expect(validateAccount({ ...valid, password: "x".repeat(73) })).toMatchObject({ ok: false, errors: { password: expect.any(String) } });
    expect(validateAccount({ ...valid, password: "12345678" })).toMatchObject({ ok: true });
    expect(validateAccount({ ...valid, password: "x".repeat(72) })).toMatchObject({ ok: true });
  });

  it("refuse un rôle qui n'est pas du personnel", () => {
    expect(validateAccount({ ...valid, role: "customer" as never })).toMatchObject({ ok: false, errors: { role: expect.any(String) } });
  });

  it("rend toutes les erreurs d'un coup", () => {
    const result = validateAccount({ firstName: "", lastName: "", email: "", phone: "", role: "seller", password: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["email", "firstName", "lastName", "password"]);
  });
});

describe("roleChoices : vers quel rôle on peut changer un compte", () => {
  it("jamais vers admin : on devient admin à la création du compte seulement", () => {
    for (const role of STAFF_ROLES) expect(roleChoices(role)).not.toContain("admin");
  });

  it("propose les rôles du dessous, sauf le rôle actuel", () => {
    expect(roleChoices("seller")).toEqual(["order_manager"]);
    expect(roleChoices("order_manager")).toEqual(["seller"]);
    expect(roleChoices("admin")).toEqual(["order_manager", "seller"]);
  });
});

describe("ROLE_LABELS", () => {
  it("un libellé français pour chaque rôle du personnel", () => {
    expect(ROLE_LABELS).toEqual({ admin: "Administrateur", order_manager: "Responsable commande", seller: "Vendeur" });
    expect([...STAFF_ROLES].sort()).toEqual(Object.keys(ROLE_LABELS).sort());
  });
});
