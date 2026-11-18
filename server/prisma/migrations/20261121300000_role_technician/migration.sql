-- L'atelier, étape 5 (18/11) : le rôle technicien. Migration additive. La valeur n'est pas utilisée dans cette
-- migration (PostgreSQL l'interdit dans la même transaction).
ALTER TYPE "Role" ADD VALUE 'technician';
