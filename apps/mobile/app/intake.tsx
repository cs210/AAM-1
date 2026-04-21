import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useMutation } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthGuard } from '@/components/AuthGuard';
import { cn } from '@/lib/utils';

const GRADIENT_COLORS = ['#F5E8DC', '#EDE6E8', '#E5E0E8'] as const;
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };
const ALLOWED_REDIRECTS = new Set([
  '/(tabs)/home',
  '/(tabs)/explore',
  '/(tabs)/profile',
]);

/** Lucide / navigation APIs still need literal colors for this flow’s warm palette */
const UI = {
  text: '#2C2825',
  textMuted: '#5C5652',
  cardBg: '#FDFCFA',
  cardBorder: 'rgba(255,255,255,0.9)',
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

export default function IntakeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirectParam =
    typeof params.redirect === 'string' && params.redirect.length > 0
      ? params.redirect
      : undefined;
  const redirect = redirectParam && ALLOWED_REDIRECTS.has(redirectParam) ? redirectParam : undefined;
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
      console.error('Failed to save user interests', error);
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
      router.replace(redirect as Parameters<typeof router.replace>[0]);
    } else {
      router.back();
    }
  }, [redirect, router]);

  if (isComplete) {
    return (
      <AuthGuard>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[...GRADIENT_COLORS]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          className="flex-1"
          style={{ flex: 1 }}>
          <SafeAreaView className="flex-1" style={{ flex: 1 }} edges={['top', 'left', 'right']}>
            <View className="flex-1 justify-center px-6 pb-8 pt-14">
              <Text className="mb-3 text-[28px] font-semibold tracking-wide" style={{ color: UI.text }}>
                Thanks for sharing.
              </Text>
              <Text className="mb-8 text-[17px] leading-6" style={{ color: UI.textMuted }}>
                We&apos;ll use your answers to tailor what we show you and to improve our programs.
              </Text>
              <Pressable
                onPress={handleDone}
                className="self-start rounded-xl px-6 py-3.5 active:opacity-90"
                style={{ backgroundColor: UI.accent }}>
                <Text className="text-base font-semibold" style={{ color: UI.cardBg }}>
                  Done
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
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
        className="flex-1"
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1" style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
          <View className="h-1" style={{ backgroundColor: UI.progressBg }}>
            <View className="h-full" style={{ width: `${progress}%`, backgroundColor: UI.progressFill }} />
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View className="mb-8 items-center">
                <Text className="mb-2 text-center text-xs uppercase tracking-wider text-muted-foreground">
                  Question {step + 1} of {QUESTIONS.length}
                </Text>
                <Text className="px-2 text-center text-2xl font-semibold leading-8 text-foreground">
                  {currentQuestion.question}
                </Text>
                {currentQuestion.subtext ? (
                  <Text className="mt-2 text-center text-base leading-[22px] text-muted-foreground">
                    {currentQuestion.subtext}
                  </Text>
                ) : null}
              </View>

              {currentQuestion.type === 'choice' && currentQuestion.choices ? (
                <View className="w-full max-w-md items-center gap-3 self-center">
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
                        className={cn(
                          'w-full max-w-[340px] rounded-xl border border-white/90 px-5 py-4 shadow-sm shadow-black/10 active:opacity-90',
                          isSelected ? 'border-[1.5px]' : 'border'
                        )}
                        style={{
                          backgroundColor: UI.cardBg,
                          borderColor: isSelected ? UI.accent : UI.cardBorder,
                        }}>
                        <Text
                          className={cn(
                            'text-center text-base',
                            isSelected ? 'font-semibold text-foreground' : 'font-medium'
                          )}
                          style={{ color: UI.text }}>
                          {choice}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {currentQuestion.type === 'scale' && currentQuestion.scaleMax ? (
                <View className="mb-2 w-full items-center">
                  <View className="mb-4 flex-row items-center justify-center gap-2.5">
                    {Array.from({ length: currentQuestion.scaleMax }, (_, i) => i + 1).map((n) => {
                      const isSelected = answers[currentQuestion.id] === n;
                      return (
                        <Pressable
                          key={n}
                          onPress={() => {
                            setAnswer(currentQuestion.id, n);
                            setTimeout(goNext, 280);
                          }}
                          className={cn(
                            'size-12 items-center justify-center rounded-[10px] border shadow-sm shadow-black/10 active:opacity-90'
                          )}
                          style={{
                            backgroundColor: isSelected ? UI.accent : UI.cardBg,
                            borderColor: isSelected ? UI.accent : UI.cardBorder,
                          }}>
                          <Text
                            className="text-lg font-semibold"
                            style={{ color: isSelected ? UI.cardBg : UI.text }}>
                            {n}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {currentQuestion.scaleLabels ? (
                    <View className="w-full max-w-[280px] flex-row justify-between px-1">
                      <Text className="max-w-20 text-left text-xs text-muted-foreground">
                        {currentQuestion.scaleLabels.start}
                      </Text>
                      {currentQuestion.scaleLabels.mid ? (
                        <Text className="max-w-20 flex-1 text-center text-xs text-muted-foreground">
                          {currentQuestion.scaleLabels.mid}
                        </Text>
                      ) : null}
                      <Text className="max-w-20 text-right text-xs text-muted-foreground">
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
                  className="min-h-[100px] rounded-xl border border-white/90 px-[18px] py-3.5 text-base shadow-sm shadow-black/10"
                  style={{
                    backgroundColor: UI.cardBg,
                    borderColor: UI.cardBorder,
                    color: UI.text,
                    textAlignVertical: 'top',
                  }}
                />
              ) : null}

              <View className="mt-auto flex-row justify-between pt-8">
                <Pressable
                  onPress={goBack}
                  className="size-11 items-center justify-center rounded-full bg-white/60 active:opacity-90"
                  hitSlop={12}>
                  <Icon as={ArrowLeft} size={24} color={UI.text} />
                </Pressable>
                <Pressable
                  onPress={goNext}
                  className="size-11 items-center justify-center rounded-full bg-white/60 active:opacity-90"
                  hitSlop={12}>
                  <Icon as={ArrowRight} size={24} color={UI.text} />
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </AuthGuard>
  );
}
