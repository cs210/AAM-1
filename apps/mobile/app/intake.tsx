import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Gradient + UI palette (warm peach/sand → soft lavender/gray, different from reference)
const GRADIENT_COLORS = ['#F5E8DC', '#EDE6E8', '#E5E0E8'] as const;
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

const UI = {
  text: '#2C2825',
  textMuted: '#5C5652',
  cardBg: '#FDFCFA',
  cardBorder: 'rgba(255,255,255,0.9)',
  cardShadow: '#D4CEC8',
  accent: '#8B7355',
  progressBg: 'rgba(44,40,37,0.12)',
  progressFill: '#6B5B4D',
} as const;

type QuestionType = 'choice' | 'text' | 'scale';

interface Question {
  id: string;
  question: string;
  subtext?: string;
  type: QuestionType;
  choices?: string[];
  scaleMax?: number;
  scaleLabels?: { start: string; mid?: string; end: string };
  placeholder?: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'visit_frequency',
    question: 'How often do you visit museums?',
    type: 'choice',
    choices: ['Rarely or never', 'Once a year', 'A few times a year', 'Monthly or more'],
  },
  {
    id: 'favorite_type',
    question: 'What kind of museums do you enjoy most?',
    type: 'choice',
    choices: ['Art', 'History', 'Science & nature', 'Children / family', 'All of the above'],
  },
  {
    id: 'visit_style',
    question: 'When you visit, how do you like to experience exhibits?',
    type: 'choice',
    choices: ['Solo, at my own pace', 'With family or friends', 'With a tour or guide', 'A mix of both'],
  },
  {
    id: 'motivation',
    question: 'What usually draws you to a museum?',
    type: 'choice',
    choices: ['A specific exhibition', 'Learning something new', 'Quiet and reflection', 'Fun with others'],
  },
  {
    id: 'barriers',
    question: "What sometimes holds you back from visiting?",
    type: 'choice',
    choices: ['Time', 'Cost', 'Distance', "Not sure what's on", 'Nothing really'],
  },
  {
    id: 'interest_scale',
    question: 'How interested are you in learning about local history and culture?',
    type: 'scale',
    scaleMax: 5,
    scaleLabels: {
      start: 'Not interested',
      end: 'Very interested',
    },
  },
  {
    id: 'preferred_time',
    question: 'When do you usually prefer to visit?',
    type: 'choice',
    choices: ['Weekday morning', 'Weekday afternoon', 'Weekend', 'Anytime'],
  },
  {
    id: 'programs',
    question: 'Would you take part in programs like talks, workshops, or family days?',
    type: 'choice',
    choices: ['Yes, regularly', 'Sometimes', 'Maybe', 'Probably not'],
  },
  {
    id: 'discovery',
    question: 'How do you usually find out about exhibitions or events?',
    type: 'choice',
    choices: ['Social media', 'Website or newsletter', 'Word of mouth', 'Walking by / signs'],
  },
  {
    id: 'anything_else',
    question: "Anything else you'd like us to know about your museum interests?",
    subtext: 'Few words or a sentence is great!',
    type: 'text',
    placeholder: 'e.g. I love outdoor sculpture gardens…',
  },
];

const SQUARE_SIZE = 48;
const CARD_SHADOW = {
  shadowColor: UI.cardShadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 2,
};

export default function IntakeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect =
    typeof params.redirect === 'string' && params.redirect.length > 0
      ? params.redirect
      : undefined;
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string | number>>({});
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const currentQuestion = QUESTIONS[step];
  const isComplete = step >= QUESTIONS.length;
  const progress =
    QUESTIONS.length > 0
      ? isComplete
        ? 100
        : ((step + 1) / QUESTIONS.length) * 100
      : 0;

  const setAnswer = React.useCallback((key: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveUserInterests = useMutation(api.userInterests.saveForCurrentAccount);

  const submitAnswers = React.useCallback(async () => {
    if (hasSubmitted) return;
    setHasSubmitted(true);
    try {
      await saveUserInterests({
        userInfo: answers,
      });
    } catch (error) {
      console.error("Failed to save user interests", error);
    }
  }, [answers, hasSubmitted, saveUserInterests]);

  const goNext = React.useCallback(() => {
    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setStep(QUESTIONS.length);
    }
  }, [step]);

  const goBack = React.useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
    else router.back();
  }, [step, router]);

  React.useEffect(() => {
    if (isComplete && !hasSubmitted) {
      void submitAnswers();
    }
  }, [isComplete, hasSubmitted, submitAnswers]);

  const handleDone = React.useCallback(() => {
    if (redirect) {
      router.replace(redirect);
    } else {
      router.back();
    }
  }, [redirect, router]);

  if (isComplete) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[...GRADIENT_COLORS]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={styles.gradient}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.completionInner}>
              <Text style={[styles.title, { marginBottom: 12 }]}>Thanks for sharing.</Text>
              <Text style={[styles.subtext, { marginBottom: 32 }]}>
                We'll use your answers to tailor what we show you and to improve our programs.
              </Text>
              <Pressable
                onPress={handleDone}
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Learning about you',
          headerStyle: { backgroundColor: GRADIENT_COLORS[0] },
          headerTintColor: UI.text,
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      />
      <LinearGradient
        colors={[...GRADIENT_COLORS]}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
            <View style={styles.questionBlock}>
              <Text style={styles.stepLabel}>
                Question {step + 1} of {QUESTIONS.length}
              </Text>
              <Text style={styles.questionTitle}>{currentQuestion.question}</Text>
              {currentQuestion.subtext ? (
                <Text style={styles.subtextCentered}>{currentQuestion.subtext}</Text>
              ) : null}
            </View>

            {currentQuestion.type === 'choice' && currentQuestion.choices ? (
              <View style={styles.choicesStack}>
                {currentQuestion.choices.map((choice) => {
                  const isSelected =
                    String(answers[currentQuestion.id]).toLowerCase() === choice.toLowerCase();
                  return (
                    <Pressable
                      key={choice}
                      onPress={() => {
                        setAnswer(currentQuestion.id, choice);
                        setTimeout(goNext, 280);
                      }}
                      style={({ pressed }) => [
                        styles.choiceCard,
                        isSelected && styles.choiceCardSelected,
                        pressed && styles.pressed,
                      ]}>
                      <Text
                        style={[
                          styles.choiceText,
                          isSelected && styles.choiceTextSelected,
                        ]}>
                        {choice}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {currentQuestion.type === 'scale' && currentQuestion.scaleMax ? (
              <View style={styles.scaleBlock}>
                <View style={styles.scaleRow}>
                  {Array.from({ length: currentQuestion.scaleMax }, (_, i) => i + 1).map(
                    (n) => {
                      const isSelected = answers[currentQuestion.id] === n;
                      return (
                        <Pressable
                          key={n}
                          onPress={() => {
                            setAnswer(currentQuestion.id, n);
                            setTimeout(goNext, 280);
                          }}
                          style={({ pressed }) => [
                            styles.scaleSquare,
                            isSelected && styles.scaleSquareSelected,
                            pressed && styles.pressed,
                          ]}>
                          <Text
                            style={[
                              styles.scaleNumber,
                              isSelected && styles.scaleNumberSelected,
                            ]}>
                            {n}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>
                {currentQuestion.scaleLabels ? (
                  <View style={styles.scaleLabelsRow}>
                    <Text style={styles.scaleLabelText}>
                      {currentQuestion.scaleLabels.start}
                    </Text>
                    {currentQuestion.scaleLabels.mid ? (
                      <Text style={[styles.scaleLabelText, styles.scaleLabelMid]}>
                        {currentQuestion.scaleLabels.mid}
                      </Text>
                    ) : null}
                    <Text style={[styles.scaleLabelText, styles.scaleLabelEnd]}>
                      {currentQuestion.scaleLabels.end}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {currentQuestion.type === 'text' ? (
              <TextInput
                placeholder={currentQuestion.placeholder}
                placeholderTextColor={UI.textMuted}
                value={String(answers[currentQuestion.id] ?? '')}
                onChangeText={(t) => setAnswer(currentQuestion.id, t)}
                multiline
                numberOfLines={3}
                style={styles.textInput}
              />
            ) : null}

            <View style={styles.footer}>
              <Pressable
                onPress={goBack}
                style={({ pressed }) => [styles.navIconButton, pressed && styles.pressed]}
                hitSlop={12}>
                <Icon as={ArrowLeft} size={24} color={UI.text} />
              </Pressable>
              <Pressable
                onPress={goNext}
                style={({ pressed }) => [styles.navIconButton, pressed && styles.pressed]}
                hitSlop={12}>
                <Icon as={ArrowRight} size={24} color={UI.text} />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  progressTrack: {
    height: 3,
    backgroundColor: UI.progressBg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: UI.progressFill,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  stepLabel: {
    fontSize: 13,
    color: UI.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  questionBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: UI.text,
    lineHeight: 32,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  subtextCentered: {
    fontSize: 16,
    color: UI.textMuted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  subtext: {
    fontSize: 17,
    color: UI.textMuted,
    lineHeight: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: UI.text,
    letterSpacing: 0.3,
  },
  choicesStack: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 12,
  },
  choiceCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: UI.cardBg,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...CARD_SHADOW,
  },
  choiceCardSelected: {
    borderColor: UI.accent,
    borderWidth: 1.5,
  },
  choiceText: {
    fontSize: 16,
    color: UI.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  choiceTextSelected: {
    fontWeight: '600',
  },
  scaleBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 8,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  scaleSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 10,
    backgroundColor: UI.cardBg,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  scaleSquareSelected: {
    backgroundColor: UI.accent,
    borderColor: UI.accent,
  },
  scaleNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: UI.text,
  },
  scaleNumberSelected: {
    color: UI.cardBg,
  },
  scaleLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 280,
    paddingHorizontal: 4,
  },
  scaleLabelText: {
    fontSize: 12,
    color: UI.textMuted,
    maxWidth: 80,
    textAlign: 'left',
  },
  scaleLabelMid: {
    textAlign: 'center',
  },
  scaleLabelEnd: {
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: UI.cardBg,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: UI.text,
    minHeight: 100,
    textAlignVertical: 'top',
    ...CARD_SHADOW,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 32,
  },
  navIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    backgroundColor: UI.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: UI.cardBg,
  },
  completionInner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  pressed: {
    opacity: 0.92,
  },
});
