import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { Link, useSearch } from "wouter";
import { supabase } from "@/lib/supabase";
import { 
  GraduationCap, 
  Loader2, 
  Mail, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
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
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { settings } = useSystemSettings();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const search = useSearch();
  const isFromProfile = new URLSearchParams(search).get('from') === 'profile';

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Check if user exists without exposing any user data
      // head: true returns only a count in the HTTP header — no data in the response body
      const { count, error: countError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("email", data.email.toLowerCase());

      const userExists = !countError && count && count > 0;

      if (userExists) {
        // User exists — ensure they're in Supabase Auth for password reset to work
        const tempPassword = crypto.randomUUID();
        await supabase.auth.signUp({
          email: data.email.toLowerCase(),
          password: tempPassword,
        });

        // Request password reset
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const redirectUrl = isLocalhost 
          ? `${window.location.origin}/reset-password`
          : "https://dlsuqr.vercel.app/reset-password";
        
        const { error } = await supabase.auth.resetPasswordForEmail(data.email.toLowerCase(), {
          redirectTo: redirectUrl,
        });

        if (error) {
          if (error.message.includes("rate") || error.message.includes("limit")) {
            toast({
              title: "Too Many Requests",
              description: "Please wait a few minutes before requesting another reset email.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Always show the same message regardless of whether the email exists
      toast({
        title: "Request Received",
        description: "If an account with that email exists, a reset link will be sent shortly.",
      });
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      
    } catch (error) {
      // Still show the same generic message to avoid leaking info via error vs success
      toast({
        title: "Request Received",
        description: "If an account with that email exists, a reset link will be sent shortly.",
      });
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
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
            {isFromProfile ? "Reset Password" : "Forgot Password?"}
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
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Check your email</AlertTitle>
                  <AlertDescription className="text-green-700">
                    If an account exists for <span className="font-medium">{submittedEmail}</span>, 
                    you will receive a password reset link shortly.
                  </AlertDescription>
                </Alert>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm text-amber-800">
                    <strong>📧 Note:</strong> The email may arrive in your <strong>spam/junk folder</strong>. 
                    Please check there if you don't see it in your inbox.
                  </p>
                </div>

                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsSubmitted(false);
                      form.reset();
                    }}
                  >
                    Try another email
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Link href={isFromProfile ? "/profile" : "/login"}>
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {isFromProfile ? "Back" : "Back to login"}
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
                    <Link href={isFromProfile ? "/profile" : "/login"}>
                      <Button variant="ghost" className="text-sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {isFromProfile ? "Back" : "Back to login"}
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
