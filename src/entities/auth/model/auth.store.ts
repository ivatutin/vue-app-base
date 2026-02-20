import { defineStore } from 'pinia'
import { tokenStorage } from "../lib/token-storage"

export const useAuthStore = defineStore('auth', () => {
    const accessToken = ref<string | null>(tokenStorage.getAccessToken())
    const refreshToken = ref<string | null>(tokenStorage.getRefreshToken())
    const isLoaded = ref(false)

    const isSessionActive = computed(() => !!accessToken.value)

    async function login(emaiil_or_phone: string, password: string) {
        try {
            isLoaded.value = true
        } catch(e) {
            isLoaded.value = false    
        }
    }

    async function logout() {
        accessToken.value = null
        refreshToken.value = null
        isLoaded.value = false
        tokenStorage.clear()
    }

    async function refresh() {
        try {
            isLoaded.value = true
        } catch(e) {
            isLoaded.value = false    
        }      
    }
})