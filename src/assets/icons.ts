import mealPetitdej from './meal-petitdej.png';
import mealBrunch from './meal-brunch.png';
import mealDejeuner from './meal-dejeuner.png';
import mealGouter from './meal-gouter.png';
import mealDiner from './meal-diner.png';
import equipChaiseHaute from './equip-chaise-haute.png';
import equipChange from './equip-change.png';
import equipJeux from './equip-jeux.png';
import equipMenu from './equip-menu.png';
import catTout from './cat-tout.png';
import catRestaurant from './cat-restaurant.png';
import catCafe from './cat-cafe.png';
import catBoutique from './cat-boutique.png';
import catLieuPublic from './cat-lieu-public.png';
import catCoiffeur from './cat-coiffeur.png';
import catNature from './cat-nature.png.asset.json';
import catSport from './cat-sport.png.asset.json';
import catCreatif from './cat-creatif.png.asset.json';
import catCulture from './cat-culture.png.asset.json';
import catJeux from './cat-jeux.png.asset.json';

export const CATEGORY_ICONS: Record<string, string> = {
  all: catTout,
  restaurant: catRestaurant,
  cafe: catCafe,
  shop: catBoutique,
  public: catLieuPublic,
  coiffeur: catCoiffeur,
  nature: catNature.url,
  sport: catSport.url,
  creatif: catCreatif.url,
  culture: catCulture.url,
  jeux: catJeux.url,
};

export const MEAL_ICONS: Record<string, string> = {
  petitdej: mealPetitdej,
  brunch: mealBrunch,
  dejeuner: mealDejeuner,
  gouter: mealGouter,
  diner: mealDiner,
};

export type EquipKey = 'high_chair' | 'changing_table' | 'kids_area' | 'kids_menu';

export const EQUIP_ICONS: Record<EquipKey, string> = {
  high_chair: equipChaiseHaute,
  changing_table: equipChange,
  kids_area: equipJeux,
  kids_menu: equipMenu,
};

export const EQUIP_LABELS: Record<EquipKey, string> = {
  high_chair: 'Chaise haute / réhausseur',
  changing_table: 'Table à langer',
  kids_area: 'Espace jeux',
  kids_menu: 'Menu enfant',
};

export const EQUIP_SHORT_LABELS: Record<EquipKey, string> = {
  high_chair: 'Chaise',
  changing_table: 'Change',
  kids_area: 'Jeux',
  kids_menu: 'Menu',
};
