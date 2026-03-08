// screens/ResetPasswordScreen.tsx - FINAL COMPLETE CODE WITH PASSWORD VALIDATION UI

import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type ResetPasswordScreenProps = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

// =================================================================
// 🔑 KEYBOARD FIX: MOVED PasswordInput OUTSIDE 
// =================================================================

// Props interface for the PasswordInput component
interface PasswordInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    showPassword: boolean; // Pass showPassword state
    setShowPassword: (show: boolean) => void; // Pass setShowPassword function
    // Added a prop to disable the visibility toggle on the Confirm Password field
    disableToggle?: boolean; 
}

const PasswordInput: React.FC<PasswordInputProps> = ({ 
    value, 
    onChangeText, 
    placeholder, 
    showPassword, 
    setShowPassword,
    disableToggle = false // Default to false
}) => (
    <View style={styles.passwordInputContainer}>
        <TextInput
            style={styles.passwordInput}
            placeholder={placeholder}
            placeholderTextColor={Colors.muted}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
        />
        {/* Only show the toggle button if it's not disabled */}
        {!disableToggle && (
            <TouchableOpacity 
                style={styles.passwordToggle} 
                onPress={() => setShowPassword(!showPassword)}
            >
                <Ionicons 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={24} 
                    color={Colors.muted} 
                />
            </TouchableOpacity>
        )}
    </View>
);

// =================================================================

// Hosted HTTPS API base for owner password reset
const API_BASE_URL = 'https://petlandia.cafecircuit.com/API/OWNER/';
const API_RESET_REQUEST_URL = API_BASE_URL + 'request_password_reset.php';
const API_RESET_PASSWORD_URL = API_BASE_URL + 'reset_password.php';


export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ route, navigation }) => {
  
  const initialEmail = route.params?.email || '';
  
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(''); 
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [showPassword, setShowPassword] = useState(false); 

  // 1. NEW STATE: To hold validation status for UI feedback
  const [requirements, setRequirements] = useState<
    { rule: string; valid: boolean }[]
  >([]);

  // 2. NEW FUNCTION: To validate the password against all rules
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8; // min 8 characters (updated from 6)
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    // Regex for special characters: !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const newRequirements = [
      { rule: 'Minimum 8 characters', valid: minLength },
      { rule: 'At least one uppercase letter (A-Z)', valid: hasUpperCase },
      { rule: 'At least one lowercase letter (a-z)', valid: hasLowerCase },
      { rule: 'At least one digit (0-9)', valid: hasDigit },
      { rule: 'At least one special character', valid: hasSpecialChar },
    ];

    setRequirements(newRequirements);

    // Return true only if all conditions are met
    return minLength && hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar;
  };


  // Function to request the OTP code via email
  const handleRequestOtp = async () => {
    if (!email) {
        Alert.alert('Error', 'Please enter your email address.');
        return;
    }

    setLoading(true);

    try {
        const response = await fetch(API_RESET_REQUEST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            Alert.alert('Success', data.message);
            setStep(2); 
        } else {
            Alert.alert('Error', data.message || 'Failed to send reset request. Please try again.');
        }

    } catch (error) {
        console.error('Password reset request error:', error);
        Alert.alert('Network Error', 'Could not connect to the server. Please check your connection.');
    } finally {
        setLoading(false);
    }
  };


  // Function to verify OTP and submit new password
  const handleResetPassword = async () => {
    if (!email || !otp || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    
    // 3. UPDATED CHECK: Use the full validation function
    if (!validatePassword(newPassword)) {
        Alert.alert('Validation Error', 'The new password must meet all complexity requirements (Min 8 chars, Upper, Lower, Digit, Special).');
        return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_RESET_PASSWORD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          token: otp, // Pass the OTP code as the 'token'
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', data.message, [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Network Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };


  // 4. Component to render the list of password requirements
  const PasswordRequirements = () => (
    <View style={styles.requirementsContainer}>
        {requirements.map((req, index) => (
            <View key={index} style={styles.requirementRow}>
                <Ionicons 
                    name={req.valid ? 'checkmark-circle' : 'close-circle-outline'} 
                    size={16} 
                    // 5. COLOR FEEDBACK: Green for valid, default text color for invalid
                    color={req.valid ? '#4CAF50' : Colors.text} 
                    style={styles.requirementIcon}
                />
                <Text 
                    style={[
                        styles.requirementText, 
                        { color: req.valid ? '#4CAF50' : Colors.text }
                    ]}
                >
                    {req.rule}
                </Text>
            </View>
        ))}
    </View>
  );


  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
            {step === 1 ? 'Request Password Reset' : 'Verify Code & Reset Password'}
        </Text>

        {/* Step 1: Email Entry */}
        {step === 1 && (
            <>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                />
                
                <TouchableOpacity
                    style={loading ? styles.disabledButton : styles.resetButton}
                    onPress={handleRequestOtp}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Send Reset Code</Text>
                    )}
                </TouchableOpacity>
            </>
        )}

        {/* Step 2: OTP & Password Entry */}
        {step === 2 && (
            <>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code from email"
                    placeholderTextColor={Colors.muted}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    editable={!loading}
                />
                
                <Text style={styles.label}>New Password</Text>
                <PasswordInput
                    placeholder="Enter new password (min. 8 chars, complex)"
                    value={newPassword}
                    // 6. UPDATE: Call validatePassword on every change
                    onChangeText={(text) => {
                        setNewPassword(text);
                        validatePassword(text);
                    }}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                />
                
                {/* 7. CONDITIONAL DISPLAY: Show requirements only when newPassword is not empty */}
                {newPassword.length > 0 && <PasswordRequirements />}

                <Text style={styles.label}>Confirm New Password</Text>
                <PasswordInput
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    // The Confirm Password field shares the visibility state but doesn't need its own toggle icon
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    disableToggle={true} 
                />

                <TouchableOpacity
                    style={loading ? styles.disabledButton : styles.resetButton}
                    onPress={handleResetPassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Reset Password</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Request New Code</Text>
                </TouchableOpacity>
            </>
        )}
        
      </View>
    </KeyboardAvoidingView>
  );
};

// --- Styles remain the same, using the new Colors configuration, plus new styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: 20,
    backgroundColor: Colors.panel,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.brand,
    marginBottom: 25,
    textAlign: 'center',
  },
  label: {
      fontSize: 14,
      color: Colors.text,
      marginBottom: 5,
      fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    marginBottom: 15, 
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1, 
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 16,
    color: Colors.text,
  },
  passwordToggle: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center',
  },
  // NEW STYLES for the validation requirements list
  requirementsContainer: {
      paddingHorizontal: 10,
      marginBottom: 20,
      marginTop: -5, // Pull the list up closer to the input
      width: '100%',
  },
  requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
  },
  requirementIcon: {
      marginRight: 8,
  },
  requirementText: {
      fontSize: 13,
      // Default color is set in the component, but here we define the base size
  },
  resetButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.brand,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
      backgroundColor: Colors.muted, 
      opacity: 0.6,
      width: '100%',
      height: 50,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 15,
    alignSelf: 'center',
  },
  backButtonText: {
      color: Colors.brand,
      fontSize: 14,
  }
});