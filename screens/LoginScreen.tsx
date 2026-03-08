// screens/LoginScreen.tsx - WITH DEBUG LOGGING (Form-Encoded Workaround)

import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { RootStackParamList } from '../navigation/RootNavigator';

// API URLs
const API_BASE_URL = 'https://petlandia.cafecircuit.com/API/OWNER/login.php';
const API_OTP_REQUEST_URL = 'https://petlandia.cafecircuit.com/API/OWNER/request_otp.php';
const API_OTP_VERIFY_URL = 'https://petlandia.cafecircuit.com/API/OWNER/verify_otp.php';

// --- Helper Components ---
const CustomCheckbox = ({ checked, onPress, label }: { checked: boolean, onPress: () => void, label: string }) => (
  <View style={styles.checkboxContainer}>
    <TouchableOpacity style={styles.checkbox} onPress={onPress}>
      {checked && <Ionicons name="checkmark" size={18} color={Colors.brand} />}
    </TouchableOpacity>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </View>
);

const TermsAndConditionsContent = ({ onClose }: { onClose: () => void }) => (
    <ScrollView contentContainerStyle={styles.modalContent}>
        <Text style={styles.modalTitle}>Terms and Conditions</Text>
        <Text style={styles.modalText}>
          1. Acceptance of Terms: By checking the box and logging in, you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree, you should not use this application.
        </Text>
        <Pressable
          style={[styles.loginButton, styles.modalCloseButton]}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>CLOSE</Text>
        </Pressable>
      </ScrollView>
);

const OTPVerificationModal = ({
    visible,
    userData,
    serverOTPKey,
    onVerificationSuccess,
    onClose,
    onRequestResend,
}: {
    visible: boolean;
    userData: any;
    serverOTPKey: string;
    onVerificationSuccess: (userData: any) => void;
    onClose: () => void;
    onRequestResend: (userData: any) => Promise<void>;
}) => {
    const [otpCode, setOtpCode] = useState(''); 
    const [loading, setLoading] = useState(false);

    const handleOTPVerification = useCallback(async () => {
        if (otpCode.length !== 6) {
            Alert.alert("Error", "Please enter the 6-digit OTP.");
            return;
        }

        if (!userData || !serverOTPKey) {
            Alert.alert("Error", "Session expired. Please log in again."); 
            onClose(); 
            return;
        }

        setLoading(true);
        
        try {
            const response = await fetch(API_OTP_VERIFY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: userData.email, 
                    otp: otpCode,
                    otp_key: serverOTPKey, 
                }),
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert("Success", "OTP verified! You are now logged in.");
                onVerificationSuccess(userData); 
            } else {
                Alert.alert("Verification Failed", data.message || "Invalid OTP or token expired.");
            }
        } catch (error) {
            console.error("OTP Verification Network Error:", error);
            Alert.alert("Connection Error", "Could not connect to the verification service.");
        } finally {
            setLoading(false);
        }
    }, [otpCode, userData, serverOTPKey, onVerificationSuccess, onClose]);

    const handleResend = useCallback(async () => {
        setOtpCode(''); 
        await onRequestResend(userData);
    }, [onRequestResend, userData]);
    
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={() => {}} 
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.modalContent}>
                        <Ionicons name="mail-open-outline" size={50} color={Colors.brand} style={styles.icon} />
                        <Text style={styles.modalTitle}>Verify Your Email</Text>
                        <Text style={[styles.modalText, { textAlign: 'center' }]}>
                            A 6-digit One-Time Password (OTP) has been sent to <Text style={{fontWeight: 'bold'}}>{userData?.email || 'your email'}</Text>. Please check your inbox and spam folder.
                        </Text>
                        
                        <TextInput
                            style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 5 }]}
                            placeholder="— — — — — —"
                            placeholderTextColor={Colors.muted}
                            keyboardType="number-pad" 
                            maxLength={6}
                            value={otpCode}
                            onChangeText={setOtpCode}
                        />
                        
                        <TouchableOpacity 
                            style={[styles.loginButton, loading && styles.disabledButton]} 
                            onPress={handleOTPVerification} 
                            disabled={loading || otpCode.length !== 6}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.bg} />
                            ) : (
                                <Text style={styles.buttonText}>VERIFY OTP & LOG IN</Text>
                            )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.resendButton} 
                            onPress={handleResend} 
                            disabled={loading}
                        >
                            <Text style={styles.resendText}>Resend OTP</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};


// --- Main LoginScreen Component ---
type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'> & {
  onLogin: (userData: any) => void; 
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, navigation }) => {
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const [isOTPModalVisible, setIsOTPModalVisible] = useState(false);
  const userDataForLogin = React.useRef<any>(null); 
  const serverOTPKey = React.useRef<string>(''); 

  const handleForgotPasswordPress = () => {
    navigation.navigate('ResetPassword', { email: email });
  };
  
  // Request OTP from server
  const handleOTPRequest = useCallback(async (ownerData: any) => {
    if (!isOTPModalVisible) { 
        setLoading(true);
    }
    
    try {
      const response = await fetch(API_OTP_REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerData.email, owner_id: ownerData.id }),
      });

      if (!response.ok || response.headers.get('content-type')?.indexOf('application/json') === -1) {
          const errorText = await response.text();
          console.error("Server returned non-JSON/empty response:", errorText);
          Alert.alert("Request Failed", "A server error occurred. Check XAMPP logs and PHPMailer config.");
          if (!isOTPModalVisible) { setLoading(false); } 
          return;
      }
      
      const data = await response.json();

      if (data.success) {
        const otpKey = data.otp_key ?? data.data?.otp_key;
        if (!otpKey) {
          Alert.alert("OTP Request Failed", "Server response missing OTP key.");
          if (!isOTPModalVisible) { setLoading(false); }
          return;
        }
        serverOTPKey.current = otpKey; 
        userDataForLogin.current = ownerData; 
        
        setIsOTPModalVisible(true); 
        Alert.alert("Verification Required", "A One-Time Password (OTP) has been sent to your registered email address.");
      } else {
        Alert.alert("OTP Request Failed", data.message || "Could not send OTP.");
      }
    } catch (error) {
      console.error("OTP Request Network Error:", error);
      Alert.alert("Connection Error", "Could not connect to the OTP service. Check server status.");
    } finally {
        if (!isOTPModalVisible) { 
            setLoading(false);
        }
    }
  }, [isOTPModalVisible]); 

  const handleOTPVerificationSuccess = useCallback((userData: any) => {
    setIsOTPModalVisible(false);
    userDataForLogin.current = null; 
    serverOTPKey.current = '';
    onLogin(userData); 
  }, [onLogin]);

  const handleOTPModalClose = useCallback(() => {
    setIsOTPModalVisible(false);
    userDataForLogin.current = null; 
    serverOTPKey.current = '';
  }, []);

  // ===== MAIN LOGIN HANDLER WITH CRITICAL CHANGE (URL ENCODED) =====
  const handleLoginPress = async () => {
    console.log('🔵 Login button pressed');
    
    if (!email || !password) {
      Alert.alert("Login Error", "Please enter both email and password.");
      return;
    }
    
    if (!isTermsAccepted) {
      Alert.alert("Agreement Required", "You must accept the Terms and Conditions to log in.");
      return;
    }

    setLoading(true);

    try {
      // Using URLSearchParams for x-www-form-urlencoded body
      const formData = new URLSearchParams();
      formData.append('email', email.trim());
      formData.append('password', password);

      console.log('🔵 Sending login request to:', API_BASE_URL);
      console.log('🔵 Email:', email);
      console.log('🔵 Password length:', password.length);
      console.log('🔵 Request body (URL encoded):', formData.toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('🔵 Response status:', response.status);
      console.log('🔵 Response content-type:', response.headers.get('content-type'));

      const responseText = await response.text();
      console.log('🔵 Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🔵 Parsed response:', JSON.stringify(data));
      } catch (parseError) {
        console.error('🔴 JSON parse error:', parseError);
        console.log('🔴 Response was not valid JSON:', responseText);
        Alert.alert("Server Error", "Server returned invalid response. Check if your API is working correctly.");
        setLoading(false);
        return;
      }

      if (data.success) {
        console.log('✅ Login successful');
        if (data.isFirstTimeLogin) {
          await handleOTPRequest(data.owner); 
        } else {
          onLogin(data.owner); 
        }
      } else {
        console.log('🔴 Login failed:', data.message);
        Alert.alert("Login Failed", data.message || "An unknown error occurred.");
      }
    } catch (error: any) {
      console.error("🔴 Network or Fetch Error:", error);
      console.error("🔴 Error message:", error.message);
      console.error("🔴 Error stack:", error.stack);
      Alert.alert("Connection Error", `Could not connect to the server: ${error.message}`);
    } finally {
      if (!isOTPModalVisible) { 
        setLoading(false);
      }
    }
  };


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Ionicons name="lock-closed-outline" size={80} color={Colors.brand} style={styles.icon} />
        <Text style={styles.title}>Welcome Back</Text>

        <TextInput
          style={styles.input}
          placeholder="Email" 
          placeholderTextColor={Colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          autoFocus={false} 
        />
        
        <View style={styles.passwordInputContainer}>
            <TextInput
            style={styles.passwordInput}
            placeholder="Password" 
            placeholderTextColor={Colors.muted}
            secureTextEntry={!isPasswordVisible} 
            value={password}
            onChangeText={setPassword}
            autoFocus={false}
            />
            <TouchableOpacity 
                style={styles.passwordToggle} 
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            >
                <Ionicons 
                    name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                    size={24} 
                    color={Colors.muted} 
                />
            </TouchableOpacity>
        </View>
        
        <View style={styles.passwordFooter}>
            <TouchableOpacity onPress={handleForgotPasswordPress} style={styles.forgotPasswordButton}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.termsRow}>
            <CustomCheckbox
                checked={isTermsAccepted}
                onPress={() => setIsTermsAccepted(!isTermsAccepted)}
                label="" 
            />
            <Text style={styles.termsText}>
                I accept the
                <Text style={styles.termsLink} onPress={() => setIsTermsModalVisible(true)}> Terms and Conditions</Text>
            </Text>
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, (!isTermsAccepted || loading) && styles.disabledButton]} 
          onPress={handleLoginPress} 
          disabled={!isTermsAccepted || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bg} />
          ) : (
            <Text style={styles.buttonText}>LOG IN</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isTermsModalVisible}
        onRequestClose={() => setIsTermsModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TermsAndConditionsContent onClose={() => setIsTermsModalVisible(false)} />
          </View>
        </View>
      </Modal>

      {isOTPModalVisible && (
        <OTPVerificationModal
          visible={isOTPModalVisible}
          userData={userDataForLogin.current}
          serverOTPKey={serverOTPKey.current}
          onVerificationSuccess={handleOTPVerificationSuccess}
          onClose={handleOTPModalClose}
          onRequestResend={handleOTPRequest}
        />
      )}
    </KeyboardAvoidingView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.bg,
      justifyContent: 'center',
      paddingHorizontal: 25,
    },
    content: {
      alignItems: 'center',
      width: '100%',
    },
    icon: {
      marginBottom: 30,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 40,
    },
    input: {
      width: '100%',
      height: 50,
      backgroundColor: Colors.panel,
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
        backgroundColor: Colors.panel,
        borderRadius: 8,
        marginBottom: 5, 
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
    passwordFooter: {
        width: '100%',
        alignItems: 'flex-end', 
        marginBottom: 20,
    },
    forgotPasswordButton: {
        paddingVertical: 5,
        paddingHorizontal: 5,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: Colors.brand,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    loginButton: {
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
    },
    buttonText: {
      color: Colors.bg,
      fontSize: 18,
      fontWeight: 'bold',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    },
    modalView: {
        margin: 20,
        backgroundColor: Colors.bg,
        borderRadius: 10,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%', 
        maxHeight: '80%',
    },
    modalContent: {
        alignItems: 'center', 
        paddingBottom: 20,
        width: '100%',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 15,
        alignSelf: 'center',
    },
    modalText: {
        fontSize: 14,
        color: Colors.text,
        marginBottom: 10,
        lineHeight: 20,
        textAlign: 'justify',
    },
    modalCloseButton: {
        marginTop: 30,
        width: '50%',
        backgroundColor: Colors.brand,
        alignSelf: 'center',
    },
    termsRow: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: Colors.brand,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    checkboxLabel: {
        fontSize: 14,
        color: Colors.text,
    },
    termsText: {
        fontSize: 14,
        color: Colors.text,
    },
    termsLink: {
        color: Colors.brand,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    resendButton: {
        marginTop: 15,
        padding: 5,
    },
    resendText: {
        color: Colors.brand,
        textDecorationLine: 'underline',
        fontSize: 16,
    }
  });