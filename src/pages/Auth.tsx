import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, GraduationCap, Mail, User, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AuthStep = 'signin' | 'signup' | 'forgot-password';

const Auth = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<AuthStep>('signin');
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "lecturer" as "admin" | "lecturer"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [canSignUpAsAdmin, setCanSignUpAsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);




  // Check if any admin exists in the system
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1);
        
        if (error) {
          console.error('Error checking admin:', error);
          return;
        }
        
        // Only allow admin signup if no admin exists
        setCanSignUpAsAdmin(data.length === 0);
      } catch (error) {
        console.error('Error checking admin:', error);
      }
    };

    checkAdminExists();
  }, []);



  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Success",
          description: "Signed in successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent admin signup if admin already exists
    if (formData.role === 'admin' && !canSignUpAsAdmin) {
      toast({
        title: "Sign Up Disabled",
        description: "Admin registration is not allowed when an admin already exists.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Try edge function first
      console.log('Calling edge function with:', {
        full_name: formData.name,
        email: formData.email,
        role: formData.role
      });

      const { data, error } = await supabase.functions.invoke('create-lecturer-account', {
        body: {
          full_name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        }
      });

      console.log('Edge function response:', { data, error });

      // Check if there's an error OR if data contains error details
      if (error) {
        console.error('Edge function error details:', error);
        console.error('Error context:', JSON.stringify(error.context || {}));
        toast({
          title: "Sign Up Failed",
          description: `${error.message || 'Unknown error'}. Check browser console for details.`,
          variant: "destructive",
        });
        return;
      }

      // Check if data itself contains an error
      if (data && data.error) {
        console.error('Edge function returned error:', data);
        toast({
          title: "Sign Up Failed",
          description: data.details || data.error || 'Unknown error',
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Success",
          description: `${formData.role === 'admin' ? 'Admin' : 'Lecturer'} account created successfully! Signing you in...`,
        });
        
        // Automatically sign in the user after successful account creation
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (signInError) {
            console.error('Auto sign-in error:', signInError);
            toast({
              title: "Account Created",
              description: "Account created successfully! Please sign in manually.",
            });
            setCurrentStep('signin');
          } else if (signInData.user) {
            // User will be automatically redirected to dashboard by the Navigate component
            toast({
              title: "Welcome!",
              description: "Successfully signed in. Redirecting to dashboard...",
            });
          }
        } catch (signInError) {
          console.error('Auto sign-in error:', signInError);
          toast({
            title: "Account Created",
            description: "Account created successfully! Please sign in manually.",
          });
          setCurrentStep('signin');
        }
        
        // Clear form data
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "lecturer"
        });
      } else {
        console.error('Unexpected response:', data);
        toast({
          title: "Sign Up Failed",
          description: data?.error || data?.details || 'Unknown error occurred',
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setResetEmailSent(true);
      toast({
        title: "Reset Email Sent",
        description: "Please check your email for password reset instructions.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loading size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const renderSignInForm = () => (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email" className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Address
        </Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="h-10 text-muted-foreground/80"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password" className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Password
        </Label>
        <div className="relative">
          <Input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
            className="h-10 pr-10 text-muted-foreground/80"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-10 px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-10"
        disabled={isLoading}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Sign In
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full h-10 hover:underline hover:decoration-2 hover:bg-transparent"
        onClick={() => setCurrentStep('forgot-password')}
      >
        Forgot Password?
      </Button>
    </form>
  );

  const renderSignUpForm = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      {/* Role Selection */}
      <div className="space-y-2">
        <Label htmlFor="signup-role" className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Account Type
        </Label>
        <Select
          value={formData.role}
          onValueChange={(value: "admin" | "lecturer") => {
            // Only allow changing to admin if no admin exists
            if (value === 'admin' && !canSignUpAsAdmin) {
              toast({
                title: "Admin Exists",
                description: "Cannot create admin account. An admin already exists.",
                variant: "destructive",
              });
              return;
            }
            setFormData({ ...formData, role: value });
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lecturer">Lecturer</SelectItem>
            <SelectItem value="admin" disabled={!canSignUpAsAdmin}>
              Admin {!canSignUpAsAdmin && "(Already exists)"}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-name" className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Full Name
        </Label>
        <Input
          id="signup-name"
          type="text"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          required
          disabled={isLoading}
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Address
        </Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={isLoading}
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Password
        </Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
            disabled={isLoading}
            className="h-10 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-10 px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-10"
        disabled={isLoading}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Sign Up as {formData.role === 'admin' ? 'Admin' : 'Lecturer'}
      </Button>
    </form>
  );

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      {resetEmailSent ? (
        <div className="text-center space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              Password reset email sent! Please check your inbox and follow the instructions to reset your password.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-10"
            onClick={() => {
              setCurrentStep('signin');
              setResetEmailSent(false);
              setFormData({
                name: "",
                email: "",
                password: "",
                role: "lecturer"
              });
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </div>
      ) : (
        <>
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground/80">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="h-10"
            />
          </div>
          <Button type="submit" className="w-full h-10" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Send Reset Email
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-10"
            onClick={() => {
              setCurrentStep('signin');
              setFormData({
                name: "",
                email: "",
                password: "",
                role: "lecturer"
              });
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </>
      )}
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-lg mb-3 sm:mb-4">
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">
            GTTTC ENIET Kumba
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/85">
            School Management System
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">
              {currentStep === 'forgot-password' ? 'Reset Password' : 'Welcome'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {currentStep === 'forgot-password' 
                ? 'Enter your email address to receive password reset instructions' 
                : 'Sign in to your account or create a new one'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-6">
            {currentStep === 'forgot-password' ? renderForgotPasswordForm() : (
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin" className="text-sm">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm">
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-4 sm:mt-6">
                  {renderSignInForm()}
                </TabsContent>

                <TabsContent value="signup" className="mt-4 sm:mt-6">
                  {renderSignUpForm()}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
