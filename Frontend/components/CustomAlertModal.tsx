import React from 'react';
import Modal from 'react-native-modal';  // ✅ Correct import
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CustomAlertModalProps {
    isVisible: boolean;
    onClose: () => void;
    message: string;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({ isVisible, onClose, message }) => {
    const { isDark, styles: themeStyles } = useTheme();

    return (
        <Modal
            isVisible={isVisible}  // ✅ Affichage conditionnel
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            useNativeDriver
            hideModalContentWhileAnimating
            style={styles.modal}
        >
            <View style={[
                styles.container,
                isDark ? styles.containerDark : styles.containerLight
            ]}>
                <Text style={[
                    styles.message,
                    isDark ? styles.messageDark : styles.messageLight
                ]}>
                    {message}
                </Text>

                <Pressable
                    style={[
                        styles.button,
                        isDark ? styles.buttonDark : styles.buttonLight
                    ]}
                    onPress={onClose}
                >
                    <Text style={[
                        styles.buttonText,
                        isDark ? styles.buttonTextDark : styles.buttonTextLight
                    ]}>
                        OK
                    </Text>
                </Pressable>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        margin: 20,
    },
    container: {
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    containerDark: {
        backgroundColor: '#03082F',
        borderColor: '#ffffff20',
        borderWidth: 1,
    },
    containerLight: {
        backgroundColor: '#ffffff',
        borderColor: '#03082F20',
        borderWidth: 1,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    messageDark: {
        color: '#ffffff',
    },
    messageLight: {
        color: '#03082F',
    },
    button: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonDark: {
        backgroundColor: '#ffffff',
    },
    buttonLight: {
        backgroundColor: '#03082F',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonTextDark: {
        color: '#03082F',
    },
    buttonTextLight: {
        color: '#ffffff',
    },
});

export default CustomAlertModal;
