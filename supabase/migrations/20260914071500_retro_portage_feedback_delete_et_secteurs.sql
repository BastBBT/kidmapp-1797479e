-- Rétro-portage de deux écarts entre la prod et le versionné (D5 du plan de portage
-- « profil famille »). Ces deux objets EXISTENT DÉJÀ en production : ils y ont été
-- appliqués hors migration, et n'ont jamais été redescendus dans l'historique.
--
-- Ce fichier ne crée donc rien de neuf sur la base actuelle. Il existe pour qu'une base
-- reconstruite depuis les seules migrations versionnées (`supabase db reset`, futur
-- environnement de recette) soit fonctionnelle — aujourd'hui elle ne le serait pas.
--
-- Strictement idempotent : il sera rejoué sur une base où tout est déjà en place.

-- 1. recommendation_feedback : DELETE manquant
--
-- La migration de création (20260902193703) n'a accordé que SELECT et INSERT, et n'a
-- défini aucune policy DELETE. Or les trois clients retogglent un avis par
-- delete-puis-insert (jamais d'upsert : la table n'a aucun index unique sur la cible).
--
-- Des deux lignes ci-dessous, c'est la **policy** qui est le verrou effectif : RLS refuse
-- par défaut, donc sans elle aucun DELETE ne touche jamais la moindre ligne et le feedback
-- par item ne marche pas. Le GRANT, lui, est explicite plutôt que strictement nécessaire
-- sur la base actuelle (les default privileges Supabase du schéma `public` couvrent déjà
-- le privilège de table) — mais il l'est sur une base reconstruite qui ne les aurait pas.
-- Patron repris tel quel de `event_favorites`.
--
-- Pas d'UPDATE : aucun des trois clients n'en fait.

GRANT DELETE ON public.recommendation_feedback TO authenticated;

-- Créée sans `DROP POLICY` préalable : un DROP retirerait une protection RLS le temps de
-- la recréation, et c'est précisément ce que la garde sécurité du dépôt refuse — à raison.
-- Le bloc ci-dessous est idempotent sans jamais rien retirer.
DO $$
BEGIN
  CREATE POLICY "recommendation_feedback_delete_own" ON public.recommendation_feedback
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. zones_reference : les 6 secteurs
--
-- La migration 20260903161302 a élargi le CHECK de `kind` à 'secteur' mais n'a inséré
-- aucune ligne — les 6 secteurs ont été posés à la main. Ce sont des repères volontairement
-- larges, proposés sous la liste des communes pour couvrir les familles dont la commune
-- n'a encore aucun contenu publié.
--
-- Libellés et coordonnées relevés en base le 2026-09-14, pas recopiés depuis un client :
-- l'apostrophe est bien droite (U+0027) et le séparateur de « Sud Loire · Grand-Lieu » est
-- un point médian (U+00B7). Une apostrophe typographique ferait silencieusement diverger
-- la clé primaire et perdre l'emoji décoratif côté client, qui l'associe par égalité de
-- chaîne.

INSERT INTO public.zones_reference (label, kind, lat, lng) VALUES
  ('Nantes Métropole',         'secteur', 47.2184, -1.5536),
  ('Pays d''Ancenis',          'secteur', 47.3667, -1.1667),
  ('Pays de Retz',             'secteur', 46.9928, -1.8226),
  ('Presqu''île guérandaise',  'secteur', 47.3333, -2.4265),
  ('Sud Loire · Grand-Lieu',   'secteur', 47.1167, -1.6167),
  ('Vignoble nantais',         'secteur', 47.0867, -1.2822)
ON CONFLICT (label) DO NOTHING;
