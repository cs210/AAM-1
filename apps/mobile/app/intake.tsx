import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { RN_STYLE } from '@/constants/rn-api-colors';
import { cn } from '@/lib/utils';
import { api } from '@packages/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

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
  multiSelect?: boolean;
}

const QUESTIONS: Question[] = [
  {
    id: 'visit_frequency',
    question: 'How often do you visit museums?',
    type: 'choice',
    choices: ['Rarely or Never', 'Once a Year', 'A Few Times a Year', 'Monthly or More'],
  },
  {
    id: 'favorite_type',
    question: 'What kind of museums do you enjoy most?',
    type: 'choice',
    choices: ['Art', 'History', 'Science & Nature', 'Children / Family', 'All of the Above'],
    multiSelect: true,
  },
  {
    id: 'visit_style',
    question: 'When you visit, how do you like to experience exhibits?',
    type: 'choice',
    choices: ['Solo, at My Own Pace', 'With Family or Friends', 'With a Tour or Guide', 'A Mix of Both'],
  },
  {
    id: 'motivation',
    question: 'What usually draws you to a museum?',
    type: 'choice',
    choices: ['A Specific Exhibition', 'Learning Something New', 'Quiet and Reflection', 'Fun with Others'],
    multiSelect: true,
  },
  {
    id: 'barriers',
    question: 'What sometimes holds you back from visiting?',
    type: 'choice',
    choices: ['Time', 'Cost', 'Distance', "Not Sure What's On", 'Nothing Really'],
    multiSelect: true,
  },
  {
    id: 'interest_scale',
    question: 'How interested are you in learning about local history and culture?',
    type: 'scale',
    scaleMax: 5,
    scaleLabels: {
      start: 'Not Interested',
      end: 'Very Interested',
    },
  },
  {
    id: 'preferred_time',
    question: 'When do you usually prefer to visit?',
    type: 'choice',
    choices: ['Weekday Morning', 'Weekday Afternoon', 'Weekend', 'Anytime'],
  },
  {
    id: 'programs',
    question: 'Would you take part in programs like talks, workshops, or family days?',
    type: 'choice',
    choices: ['Yes, Regularly', 'Sometimes', 'Maybe', 'Probably Not'],
  },
  {
    id: 'discovery',
    question: 'How do you usually find out about exhibitions or events?',
    type: 'choice',
    choices: ['Social Media', 'Website or Newsletter', 'Word of Mouth', 'Walking by / Signs', "I don't"],
    multiSelect: true,
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
  const { theme } = useUniwind();
  const palette = theme === 'dark' ? RN_STYLE.dark : RN_STYLE.light;

  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect =
    typeof params.redirect === 'string' && params.redirect.length > 0
      ? params.redirect
      : undefined;
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string | number | string[]>>({});
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const currentQuestion = QUESTIONS[step];
  const isComplete = step >= QUESTIONS.length;
  const progress =
    QUESTIONS.length > 0
      ? isComplete
        ? 100
        : ((step + 1) / QUESTIONS.length) * 100
      : 0;

  const setAnswer = React.useCallback((key: string, value: string | number | string[]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleMultiSelect = React.useCallback((key: string, choice: string) => {
    setAnswers((prev) => {
      const current = prev[key] as string[] | undefined;
      const selected = current ?? [];
      const index = selected.indexOf(choice);
      if (index > -1) {
        return { ...prev, [key]: selected.filter((_, i) => i !== index) };
      } else {
        return { ...prev, [key]: [...selected, choice] };
      }
    });
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
        <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <View className="flex-1 justify-center px-6 pb-8 pt-6">
            <Text className="mb-2 text-center text-4xl font-bold tracking-tight text-stone-900 dark:text-foreground">
              Museum&
            </Text>
            <Text className="mb-3 text-center text-2xl font-semibold tracking-tight text-foreground">
              Thanks for sharing.
            </Text>
            <Text className="mb-8 text-center text-base leading-6 text-muted-foreground">
              {"We'll use your answers to tailor what we show you and to improve our programs."}
            </Text>
            <Button
              className="self-center shadow-md shadow-black/10"
              size="lg"
              onPress={handleDone}>
              <Text className="text-base font-semibold text-primary-foreground">Done</Text>
            </Button>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Learning about you',
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.foreground,
          headerTitleStyle: { color: palette.foreground, fontWeight: '600' },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
        <View className="h-1 bg-muted">
          <View className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
          <ScrollView
            className="flex-1 bg-background"
            style={{ flex: 1 }}
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
                  let isSelected = false;
                  if (currentQuestion.multiSelect) {
                    const selected = answers[currentQuestion.id] as string[] | undefined;
                    isSelected = (selected ?? []).includes(choice);
                  } else {
                    isSelected =
                      String(answers[currentQuestion.id]).toLowerCase() === choice.toLowerCase();
                  }
                  return (
                    <Pressable
                      key={choice}
                      onPress={() => {
                        if (currentQuestion.multiSelect) {
                          toggleMultiSelect(currentQuestion.id, choice);
                        } else {
                          setAnswer(currentQuestion.id, choice);
                          setTimeout(goNext, 280);
                        }
                      }}
                      className={cn(
                        'w-full max-w-[340px] rounded-xl border px-5 py-4 shadow-sm shadow-black/5 active:opacity-90',
                        isSelected
                          ? 'border-primary bg-primary/10 dark:bg-primary/15'
                          : 'border-border bg-card'
                      )}>
                      <Text
                        className={cn(
                          'text-center text-base text-card-foreground',
                          isSelected ? 'font-semibold text-foreground' : 'font-medium'
                        )}>
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
                          'size-12 items-center justify-center rounded-[10px] border shadow-sm shadow-black/5 active:opacity-90',
                          isSelected ? 'border-primary bg-primary' : 'border-border bg-card'
                        )}>
                        <Text
                          className={cn(
                            'text-lg font-semibold',
                            isSelected ? 'text-primary-foreground' : 'text-foreground'
                          )}>
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
              <Input
                placeholder={currentQuestion.placeholder}
                value={String(answers[currentQuestion.id] ?? '')}
                onChangeText={(t) => setAnswer(currentQuestion.id, t)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="min-h-[100px] py-3.5"
              />
            ) : null}

            <View className="mt-auto flex-row justify-between pt-8">
              <Button variant="outline" size="icon" className="rounded-full" onPress={goBack}>
                <Icon as={ArrowLeft} size={24} className="text-foreground" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" onPress={goNext}>
                <Icon as={ArrowRight} size={24} className="text-foreground" />
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthGuard>
  );
}
