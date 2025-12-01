import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, CreditCard, Bell, Shield, LogOut, Upload, Check, Phone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api";

interface ProfileData {
  id: number;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  profile_completed: boolean;
  contact_source: string | null;
  is_verified: boolean;
  completion_percentage: number;
  missing_fields: string[];
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // User profile state
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
  });

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getProfile() as ProfileData;
        setProfileData(data);
        setProfile({
          fullName: data.full_name || "",
          email: data.email || "",
          phone: data.phone_number || "",
          bio: "",
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        // Fallback to user metadata if API fails
        setProfile({
          fullName: user?.user_metadata?.full_name || "",
          email: user?.email || "",
          phone: "",
          bio: "",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    // Load Gmail profile picture or stored custom picture
    const gmailPicture = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    setProfileImage(gmailPicture || "");
    window.scrollTo(0, 0);
  }, [user]);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    resumeAnalysis: true,
    jobAlerts: false,
    weeklyDigest: true,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 2MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to backend (will implement API endpoint)
      const formData = new FormData();
      formData.append("profile_image", file);
      
      // TODO: Call API to upload profile image
      // await apiClient.uploadProfileImage(formData);
      
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully"
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    setSaving(true);
    try {
      const updateData: { full_name?: string; phone_number?: string } = {};
      
      if (profile.fullName && profile.fullName !== profileData?.full_name) {
        updateData.full_name = profile.fullName;
      }
      if (profile.phone && profile.phone !== profileData?.phone_number) {
        updateData.phone_number = profile.phone;
      }
      
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No changes",
          description: "No changes to save"
        });
        setSaving(false);
        return;
      }
      
      const updated = await apiClient.updateProfile(updateData) as ProfileData;
      setProfileData(updated);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully"
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      const message = error.response?.data?.detail || "Failed to update profile";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: [
        "5 Resume Analyses per month",
        "Basic AI Feedback",
        "Standard Templates",
        "Email Support",
      ],
      current: true,
    },
    {
      name: "Pro",
      price: "$19",
      period: "per month",
      features: [
        "Unlimited Resume Analyses",
        "Advanced AI Feedback",
        "Premium Templates",
        "Priority Support",
        "Job Matching",
        "Interview Prep",
      ],
      current: false,
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$49",
      period: "per month",
      features: [
        "Everything in Pro",
        "Team Collaboration",
        "Custom Branding",
        "API Access",
        "Dedicated Support",
        "Advanced Analytics",
      ],
      current: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </motion.div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="plan" className="gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Plan</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Profile Completion Card - Only show if incomplete */}
                {profileData && profileData.completion_percentage < 100 && (
                  <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-full">
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h4 className="font-medium text-amber-900 dark:text-amber-100">Complete your profile</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Add your {profileData.missing_fields.join(" and ").toLowerCase()} to unlock all features
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-amber-700 dark:text-amber-300">Profile completion</span>
                              <span className="font-medium text-amber-900 dark:text-amber-100">{profileData.completion_percentage}%</span>
                            </div>
                            <Progress value={profileData.completion_percentage} className="h-2 bg-amber-200 dark:bg-amber-800" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>
                          Update your personal information and profile picture
                        </CardDescription>
                      </div>
                      {profileData?.profile_completed && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Check className="w-3 h-3 mr-1" /> Complete
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                      <Avatar className="w-24 h-24 ring-4 ring-lime-400">
                        <AvatarImage src={profileImage} alt="Profile" />
                        <AvatarFallback className="text-2xl bg-lime-400 text-black font-bold">
                          {profile.fullName?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          Upload Photo
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          JPG, PNG or GIF. Max size 2MB.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Form Fields */}
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fullName" className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          Full Name
                          {!profile.fullName && <span className="text-xs text-amber-600">*Required</span>}
                        </Label>
                        <Input
                          id="fullName"
                          value={profile.fullName}
                          onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                          placeholder="John Doe"
                          className={!profile.fullName ? "border-amber-300 focus:border-amber-500" : ""}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          Phone Number
                          {!profile.phone && <span className="text-xs text-amber-600">*Required</span>}
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className={!profile.phone ? "border-amber-300 focus:border-amber-500" : ""}
                        />
                        {profileData?.contact_source === 'resume' && profile.phone && (
                          <p className="text-xs text-muted-foreground">Auto-filled from your resume</p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="bio">Bio</Label>
                        <textarea
                          id="bio"
                          value={profile.bio}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          placeholder="Tell us about yourself..."
                          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                    </div>

                    <Button onClick={handleProfileUpdate} disabled={saving} className="w-full sm:w-auto bg-lime-500 hover:bg-lime-600 text-black">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Plan Tab */}
            <TabsContent value="plan" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Plan</CardTitle>
                    <CardDescription>
                      Choose the plan that's right for you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      {plans.map((plan, index) => (
                        <motion.div
                          key={plan.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative"
                        >
                          <Card className={`relative overflow-hidden ${plan.current ? 'border-accent' : ''} ${plan.popular ? 'border-primary' : ''}`}>
                            {plan.popular && (
                              <div className="absolute top-0 right-0">
                                <Badge className="rounded-none rounded-bl-lg bg-primary">
                                  Popular
                                </Badge>
                              </div>
                            )}
                            {plan.current && (
                              <div className="absolute top-0 right-0">
                                <Badge className="rounded-none rounded-bl-lg bg-accent text-black">
                                  Current
                                </Badge>
                              </div>
                            )}
                            <CardHeader>
                              <CardTitle className="text-2xl">{plan.name}</CardTitle>
                              <div className="mt-4">
                                <span className="text-4xl font-bold">{plan.price}</span>
                                <span className="text-muted-foreground ml-2">/{plan.period}</span>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <ul className="space-y-3">
                                {plan.features.map((feature) => (
                                  <li key={feature} className="flex items-start gap-2">
                                    <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                                    <span className="text-sm">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                              <Button
                                className={`w-full ${plan.current ? 'bg-muted text-muted-foreground' : plan.popular ? 'bg-accent hover:bg-accent/90 text-black' : ''}`}
                                disabled={plan.current}
                              >
                                {plan.current ? 'Current Plan' : 'Upgrade'}
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Manage how you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive email updates about your account
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, emailNotifications: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Resume Analysis Complete</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when your resume analysis is ready
                        </p>
                      </div>
                      <Switch
                        checked={notifications.resumeAnalysis}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, resumeAnalysis: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Job Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts for matching job opportunities
                        </p>
                      </div>
                      <Switch
                        checked={notifications.jobAlerts}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, jobAlerts: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly Digest</Label>
                        <p className="text-sm text-muted-foreground">
                          Get a weekly summary of your activity
                        </p>
                      </div>
                      <Switch
                        checked={notifications.weeklyDigest}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, weeklyDigest: checked })
                        }
                      />
                    </div>

                    <Button className="w-full sm:w-auto">Save Preferences</Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                    <Button className="w-full sm:w-auto">Update Password</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                    <CardDescription>
                      Manage your account and data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Sign Out</h4>
                        <p className="text-sm text-muted-foreground">
                          Sign out of your account on this device
                        </p>
                      </div>
                      <Button variant="outline" onClick={handleSignOut} className="gap-2">
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-destructive">Delete Account</h4>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all data
                        </p>
                      </div>
                      <Button variant="destructive">Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Settings;
