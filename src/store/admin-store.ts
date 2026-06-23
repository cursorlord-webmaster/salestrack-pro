import { create } from 'zustand'

type AdminState = {
  sidebarCollapsed: boolean
  createModalOpen: boolean
  toggleSidebar: () => void
  setCreateModalOpen: (open: boolean) => void
}

export const useAdminStore = create<AdminState>((set) => ({
  sidebarCollapsed: false,
  createModalOpen: false,
  toggleSidebar: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),
  setCreateModalOpen: (open) =>
    set({
      createModalOpen: open,
    }),
}))