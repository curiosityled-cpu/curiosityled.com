import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock, KeyRound } from "lucide-react";
import { resetPasswordOnFirstLogin } from "@/functions/resetPasswordOnFirstLogin";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function FirstLoginPasswordReset() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Valid email is required";
    }

    if (!temporaryPassword) {
      newErrors.temporaryPassword = "Temporary password is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = "Password must contain at least one number";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (temporaryPassword && newPassword && temporaryPassword === newPassword) {
      newErrors.newPassword = "New password must be different from temporary password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await resetPasswordOnFirstLogin({
        email: email.toLowerCase().trim(),
        temporaryPassword,
        newPassword
      });

      if (response.data?.success) {
        toast.success("Password updated successfully! Please log in with your new password.");
        
        // Redirect to login after brief delay
        setTimeout(() => {
          base44.auth.redirectToLogin();
        }, 2000);
      } else {
        setErrors({
          general: response.data?.error || "Failed to reset password"
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setErrors({
        general: error.message || "An error occurred while resetting your password"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <p className="text-sm text-gray-600">
            For security, you must change your temporary password before accessing the platform
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
                placeholder="your.email@company.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="temporaryPassword">Temporary Password</Label>
              <div className="relative">
                <Input
                  id="temporaryPassword"
                  type={showTempPassword ? "text" : "password"}
                  value={temporaryPassword}
                  onChange={(e) => {
                    setTemporaryPassword(e.target.value);
                    if (errors.temporaryPassword) setErrors({ ...errors, temporaryPassword: "" });
                  }}
                  placeholder="Enter the temporary password from your email"
                  className={errors.temporaryPassword ? "border-red-500" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowTempPassword(!showTempPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.temporaryPassword && (
                <p className="text-xs text-red-600 mt-1">{errors.temporaryPassword}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This was provided in your welcome email
              </p>
            </div>

            <div>
              <Label htmlFor="newPassword">Create New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors({ ...errors, newPassword: "" });
                  }}
                  placeholder="At least 8 characters"
                  className={errors.newPassword ? "border-red-500" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-red-600 mt-1">{errors.newPassword}</p>
              )}
              
              <div className="mt-3 space-y-2 text-xs">
                <div className={newPassword.length >= 8 ? "text-green-600 flex items-center gap-1" : "text-gray-500 flex items-center gap-1"}>
                  <CheckCircle className="w-3 h-3" />
                  At least 8 characters
                </div>
                <div className={/[A-Z]/.test(newPassword) ? "text-green-600 flex items-center gap-1" : "text-gray-500 flex items-center gap-1"}>
                  <CheckCircle className="w-3 h-3" />
                  One uppercase letter
                </div>
                <div className={/[0-9]/.test(newPassword) ? "text-green-600 flex items-center gap-1" : "text-gray-500 flex items-center gap-1"}>
                  <CheckCircle className="w-3 h-3" />
                  One number
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                  }}
                  placeholder="Re-enter your new password"
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
              {loading ? "Updating Password..." : "Update Password & Activate Account"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Security Notice</p>
                <p>After updating your password, your account will be activated and you'll be redirected to log in with your new credentials.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}