import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activationToken, setActivationToken] = useState("");
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Get token from URL
    const token = searchParams.get("token");
    const userEmail = searchParams.get("email");
    
    if (!token || !userEmail) {
      setErrors({ general: "Invalid activation link. Please contact your administrator." });
      setVerifying(false);
      return;
    }

    setActivationToken(token);
    setEmail(userEmail);
    setVerifying(false);
  }, [searchParams]);

  const validatePassword = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "Password must contain at least one number";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleActivate = async (e) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    try {
      // Call activation function
      const response = await base44.functions.invoke("activateLicenseOnFirstLogin", {
        email,
        password,
        token: activationToken
      });

      if (response.data?.success) {
        toast.success("Account activated successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setErrors({
          general: response.data?.error || "Failed to activate account"
        });
      }
    } catch (error) {
      console.error("Activation error:", error);
      setErrors({
        general: error.message || "An error occurred during activation"
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying activation link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Activate Your Account</CardTitle>
          <p className="text-sm text-gray-600">Set up your password to get started</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleActivate} className="space-y-4">
            {errors.general && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {errors.general}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">This email is associated with your account</p>
            </div>

            <div>
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: "" });
                  }}
                  placeholder="At least 8 characters"
                  className={errors.password ? "border-red-500" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password}</p>
              )}
              <div className="mt-3 space-y-2 text-xs">
                <div className={password.length >= 8 ? "text-green-600" : "text-gray-500"}>
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  At least 8 characters
                </div>
                <div className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-500"}>
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  One uppercase letter
                </div>
                <div className={/[0-9]/.test(password) ? "text-green-600" : "text-gray-500"}>
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  One number
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                  }}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Activating..." : "Activate Account"}
            </Button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Your account will be activated immediately after you set your password.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}