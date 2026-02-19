import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type LoginRequest, type User } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Storage key for persisting user session
const USER_STORAGE_KEY = "attendance_user";

// Helper to get stored user from localStorage
function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as User;
    }
  } catch {
    // Invalid stored data
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  return null;
}

// Helper to store user in localStorage
function storeUser(user: User | null) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for existing session from localStorage
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      // Return stored user (persisted login)
      return getStoredUser();
    },
    retry: false,
    staleTime: Infinity, // Don't refetch automatically
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const { identifier, password } = credentials;
      
      // Authenticate via the Express server endpoint
      // This verifies the password server-side and never exposes it to the client
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid email/ID number or password");
      }

      const safeUserData = await response.json();

      // Map response to User type (server already strips password)
      const user: User = {
        id: safeUserData.id,
        idNumber: safeUserData.idNumber || safeUserData.id_number,
        email: safeUserData.email,
        password: "",
        fullName: safeUserData.fullName || safeUserData.full_name,
        role: safeUserData.role,
        profilePicture: safeUserData.profilePicture || safeUserData.profile_picture || null,
        createdAt: safeUserData.createdAt || safeUserData.created_at ? new Date(safeUserData.createdAt || safeUserData.created_at) : null,
      };

      return user;
    },
    onSuccess: (user) => {
      // Store user in localStorage for persistence
      storeUser(user);
      queryClient.setQueryData(["auth-user"], user);
      toast({ title: "Welcome back!", description: `Logged in as ${user.fullName}` });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Clear localStorage
      storeUser(null);
      
      // Also logout from Express server
      try {
        await fetch('/api/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (e) {
        console.warn("Express logout failed (non-blocking):", e);
      }
      
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth-user"], null);
      queryClient.clear();
      setLocation("/login");
      toast({ title: "Logged out", description: "See you next time!" });
    },
  });

  const refreshUser = async () => {
    // Re-fetch user data from database if we have a stored user
    const storedUser = getStoredUser();
    if (storedUser?.id) {
      const { data: userData } = await supabase
        .from("users")
        .select("id, id_number, email, full_name, role, profile_picture, created_at")
        .eq("id", storedUser.id)
        .single();
      
      if (userData) {
        // Never store password in client-side state
        const user: User = {
          id: userData.id,
          idNumber: userData.id_number,
          email: userData.email,
          password: "",
          fullName: userData.full_name,
          role: userData.role,
          profilePicture: userData.profile_picture,
          createdAt: userData.created_at ? new Date(userData.created_at) : null,
        };
        storeUser(user);
        queryClient.setQueryData(["auth-user"], user);
      }
    }
  };

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    refreshUser,
  };
}
