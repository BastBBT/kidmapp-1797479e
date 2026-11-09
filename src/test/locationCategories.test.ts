import { describe, it, expect } from 'vitest'
import {
  PLACE_CATEGORIES, ACTIVITY_CATEGORIES, isActivity, groupOf, categoryLabels, categoryIcons,
} from '@/types/location'

describe('catégories lieux / activités (refonte 2026-11-09)', () => {
  it('Lieux = restaurant, cafe, shop, coiffeur, librairie, manege (plus de public)', () => {
    expect([...PLACE_CATEGORIES].sort()).toEqual(['cafe', 'coiffeur', 'librairie', 'manege', 'restaurant', 'shop'])
  })
  it('Activités incluent laep et aire_de_jeux, jeux est conservé', () => {
    expect(ACTIVITY_CATEGORIES).toEqual(['nature', 'sport', 'creatif', 'culture', 'jeux', 'laep', 'aire_de_jeux'])
  })
  it('manege est un lieu ; laep et aire_de_jeux sont des activités', () => {
    expect(isActivity('manege')).toBe(false)
    expect(isActivity('laep')).toBe(true)
    expect(isActivity('aire_de_jeux')).toBe(true)
    expect(groupOf('manege')).toBe('places')
    expect(groupOf('aire_de_jeux')).toBe('activities')
  })
  it('le jeton public reste toléré : lieu, jamais activité, libellé et icône de repli', () => {
    expect(isActivity('public')).toBe(false)
    expect(groupOf('public')).toBe('places')
    expect(categoryLabels.public).toBeTruthy()
    expect(categoryIcons.public).toBeTruthy()
  })
  it('jeux s affiche « Parc à thème »', () => {
    expect(categoryLabels.jeux).toBe('Parc à thème')
  })
})
