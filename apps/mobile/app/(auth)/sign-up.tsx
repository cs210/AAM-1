import { useState } from "react";
import { View, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Text as UiText } from "@/components/ui/text";

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setIsLoading(true);
    const { data, error: err } = await authClient.signUp.email({
      name,
      email,
      password,
    });
    setIsLoading(false);
    if (err) {
      setError(err.message ?? "Sign up failed");
      return;
    }
    if (data) router.replace("/(tabs)");
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-4">
            <UiText className="text-2xl font-semibold text-foreground">Create an account</UiText>
            <UiText className="text-muted-foreground">
              Enter your details to create a new account.
            </UiText>
            {error ? (
              <View className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
                <UiText className="text-sm text-destructive">{error}</UiText>
              </View>
            ) : null}
            <View className="gap-2">
              <UiText className="text-sm font-medium text-foreground">Name</UiText>
              <TextInput
                className="border-border bg-background rounded-md border px-3 py-2 text-foreground"
                placeholder="Your name"
                placeholderTextColor="#71717a"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                editable={!isLoading}
              />
            </View>
            <View className="gap-2">
              <UiText className="text-sm font-medium text-foreground">Email</UiText>
              <TextInput
                className="border-border bg-background rounded-md border px-3 py-2 text-foreground"
                placeholder="you@example.com"
                placeholderTextColor="#71717a"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>
            <View className="gap-2">
              <UiText className="text-sm font-medium text-foreground">Password</UiText>
              <TextInput
                className="border-border bg-background rounded-md border px-3 py-2 text-foreground"
                placeholder="At least 8 characters"
                placeholderTextColor="#71717a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                editable={!isLoading}
              />
            </View>
            <Button onPress={onSubmit} disabled={isLoading}>
              <UiText>{isLoading ? "Creating account…" : "Sign up"}</UiText>
            </Button>
            <View className="flex-row justify-center gap-1">
              <UiText className="text-muted-foreground text-sm">Already have an account? </UiText>
              <UiText
                className="text-primary font-medium text-sm"
                onPress={() => router.push("/(auth)/sign-in")}
              >
                Sign in
              </UiText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
