import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { 
  GraduationCap, 
  Loader2, 
  Mail, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export default function ForgotPassword() {
  const { settings } = useSystemSettings();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resetLink, setResetLink] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const copyToClipboard = async () => {
    if (resetLink) {
      await navigator.clipboard.writeText(resetLink);
      toast({
        title: "Copied!",
        description: "Reset link copied to clipboard.",
      });
    }
  };

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    setResetLink(null);
    
    try {
      // Check if user exists in our users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("email", data.email.toLowerCase())
        .single();

      if (userError || !userData) {
        // Don't reveal if email exists - show success anyway for security
        setSubmittedEmail(data.email);
        setIsSubmitted(true);
        toast({
          title: "Check your email",
          description: "If an account exists, you'll receive instructions shortly.",
        });
        return;
      }

      // Generate a secure token
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Delete any existing unused tokens for this user
      await supabase
        .from("password_reset_tokens")
        .delete()
        .eq("user_id", userData.id)
        .is("used_at", null);

      // Store the token in the database
      const { error: tokenError } = await supabase
        .from("password_reset_tokens")
        .insert({
          user_id: userData.id,
          token: token,
          expires_at: expiresAt.toISOString(),
        });

      if (tokenError) {
        console.error("Token creation error:", tokenError);
        throw new Error("Failed to create reset token");
      }

      // Generate the reset URL
      const resetUrl = `${window.location.origin}/reset-password?token=${token}`;
      
      // For prototype: Show the link directly (since we can't send emails)
      // In production, you would send this via email
      setResetLink(resetUrl);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      
      toast({
        title: "Reset link generated!",
        description: "Since this is a prototype, the reset link is shown below.",
      });
      
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 mb-4">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <GraduationCap className="w-8 h-8" />
            )}
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-gray-900">
            Forgot Password?
          </h1>
          <p className="text-muted-foreground">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="pt-6">
            {isSubmitted ? (
              // Success State
              <div className="space-y-6">
                {resetLink ? (
                  // Prototype mode: Show the reset link directly
                  <>
                    <Alert className="border-blue-200 bg-blue-50">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Reset Link Generated!</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        Since this is a prototype without email service, your reset link is shown below.
                        In production, this would be sent to <span className="font-medium">{submittedEmail}</span>.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">Your password reset link:</p>
                      <div className="flex items-center gap-2">
                        <Input 
                          readOnly 
                          value={resetLink} 
                          className="text-xs font-mono bg-gray-50"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={copyToClipboard}
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/reset-password?token=${resetLink.split('token=')[1]}`} className="flex-1">
                          <Button className="w-full">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Go to Reset Password
                          </Button>
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        This link expires in 1 hour.
                      </p>
                    </div>
                  </>
                ) : (
                  // Email not found (but we don't tell them that for security)
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Check your email</AlertTitle>
                    <AlertDescription className="text-green-700">
                      If an account exists for <span className="font-medium">{submittedEmail}</span>, 
                      you will receive a password reset link shortly.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-center space-y-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsSubmitted(false);
                      setResetLink(null);
                      form.reset();
                    }}
                  >
                    Try another email
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Link href="/login">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              // Form State
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              className="pl-9 h-11" 
                              placeholder="Enter your email address" 
                              type="email"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  <div className="text-center">
                    <Link href="/login">
                      <Button variant="ghost" className="text-sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to login
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 text-sm">
            For your security, password reset links expire after 1 hour and can only be used once.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
