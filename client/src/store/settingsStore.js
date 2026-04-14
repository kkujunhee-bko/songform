import { create } from 'zustand';
import api from '../api/client';

export const useSettingsStore = create((set, get) => ({
  defaultDenominationId: 1,
  denomination: null,
  denominations: [],
  categories: [],
  formElements: [],
  loaded: false,

  loadAll: async () => {
    try {
      const [denominations, settings] = await Promise.all([
        api.get('/denominations'),
        api.get('/settings'),
      ]);
      const defaultId = settings.default_denomination_id || 1;
      const denomination = denominations.find(d => d.id === defaultId) || denominations[0];

      const [categories, formElements] = await Promise.all([
        api.get(`/worship-categories?denomination_id=${defaultId}`),
        api.get(`/song-form-elements?denomination_id=${defaultId}`),
      ]);

      set({
        denominations,
        defaultDenominationId: defaultId,
        denomination,
        categories,
        formElements,
        loaded: true,
      });
    } catch (err) {
      console.error('설정 로드 실패:', err);
      set({ loaded: true });
    }
  },

  setDefaultDenomination: async (id) => {
    await api.patch(`/denominations/${id}/set-default`);
    const [categories, formElements, denominations] = await Promise.all([
      api.get(`/worship-categories?denomination_id=${id}`),
      api.get(`/song-form-elements?denomination_id=${id}`),
      api.get('/denominations'),
    ]);
    const denomination = denominations.find(d => d.id === id);
    set({ defaultDenominationId: id, denomination, categories, formElements, denominations });
  },

  refreshCategories: async () => {
    const { defaultDenominationId } = get();
    const categories = await api.get(`/worship-categories?denomination_id=${defaultDenominationId}`);
    set({ categories });
  },

  refreshFormElements: async () => {
    const { defaultDenominationId } = get();
    const formElements = await api.get(`/song-form-elements?denomination_id=${defaultDenominationId}`);
    set({ formElements });
  },

  refreshDenominations: async () => {
    const denominations = await api.get('/denominations');
    set({ denominations });
  },
}));
