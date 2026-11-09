import { describe, it, expect } from 'vitest'
import { locationCategoryEmoji } from '../../supabase/functions/_shared/digest/locationStyle'

describe('locationCategoryEmoji — catégories ajoutées le 2026-11-09', () => {
  it('manege a sa propre icône', () => expect(locationCategoryEmoji('manege')).not.toBe('📍'))
  it('laep a sa propre icône', () => expect(locationCategoryEmoji('laep')).not.toBe('📍'))
  it('aire_de_jeux a sa propre icône', () => expect(locationCategoryEmoji('aire_de_jeux')).not.toBe('📍'))
  it('jeux et public restent reconnus', () => {
    expect(locationCategoryEmoji('jeux')).not.toBe('📍')
    expect(locationCategoryEmoji('public')).not.toBe('📍')
  })
})
