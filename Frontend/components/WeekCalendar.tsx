import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, addMonths, isSameMonth, isWithinInterval, addDays, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { isBefore, startOfDay } from 'date-fns';

interface WeekCalendarProps {
  selectedWeeks: Date[];
  onWeekSelect: (week: Date) => void;
}

export function WeekCalendar({ selectedWeeks, onWeekSelect }: WeekCalendarProps) {
  const { isDark, styles: themeStyles } = useTheme();
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: fr });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr });
  const today = startOfDay(new Date()); // Récupérer la date du jour sans l'heure

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks = [];
  let currentWeek = [];

  days.forEach(day => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const isWeekSelected = (week: Date[]) => {
    return selectedWeeks.some(selectedWeek =>
      isSameDay(startOfWeek(selectedWeek, { locale: fr }), week[0])
    );
  };

  const isDateInSelectedWeek = (date: Date) => {
    return selectedWeeks.some(selectedWeek => {
      const weekStart = startOfWeek(selectedWeek, { locale: fr });
      const weekEnd = endOfWeek(selectedWeek, { locale: fr });
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      // Changer le mois tout en maintenant la semaine sélectionnée
      const newMonth = addMonths(prev, -1);
      return newMonth;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      // Changer le mois tout en maintenant la semaine sélectionnée
      const newMonth = addMonths(prev, 1);
      return newMonth;
    });
  };

  const handleWeekSelect = (weekStart: Date) => {
    onWeekSelect(weekStart);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={handlePrevMonth} style={styles.monthButton}>
          <ChevronLeft size={20} color={isDark ? '#ffffff' : '#03082F'} />
        </Pressable>
        <Text style={[styles.monthTitle, isDark && styles.monthTitleDark, themeStyles.textSemiBold]}>
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </Text>
        <Pressable onPress={handleNextMonth} style={styles.monthButton}>
          <ChevronRight size={20} color={isDark ? '#ffffff' : '#03082F'} />
        </Pressable>
      </View>

      <View style={styles.weekDays}>
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
          <Text key={index} style={[styles.weekDayText, isDark && styles.weekDayTextDark, themeStyles.textMedium]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendar}>
        {weeks.map((week, weekIndex) => {
          const weekStart = startOfWeek(week[0], { locale: fr });
          const isWeekPast = isBefore(weekStart, today); // Vérifier si la semaine est passée

          return (
            <Pressable
              key={weekIndex}
              style={[
                styles.week,
                isWeekSelected(week) && styles.selectedWeek,
                isDark && styles.weekDark,
                isWeekSelected(week) && isDark && styles.selectedWeekDark,
              ]}
              onPress={isWeekPast && !isSameWeek(weekStart, today) ? undefined : () => handleWeekSelect(week[0])} // Autoriser la sélection de la semaine actuelle et empêcher les semaines passées
            >
              {week.map((day, dayIndex) => {
                const isPastDay = isBefore(day, today); // Vérifier si le jour est dans le passé
                return (
                  <View
                    key={dayIndex}
                    style={[
                      styles.day,
                      !isSameMonth(day, currentMonth) && styles.outsideMonth,
                      isDateInSelectedWeek(day) && styles.selectedDay,
                      isDark && styles.dayDark,
                      !isSameMonth(day, currentMonth) && isDark && styles.outsideMonthDark,
                      isDateInSelectedWeek(day) && isDark && styles.selectedDayDark,
                      isPastDay && styles.pastDay, // Appliquer la transparence pour les jours passés
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !isSameMonth(day, currentMonth) && styles.outsideMonthText,
                        isDateInSelectedWeek(day) && styles.selectedDayText,
                        isDark && styles.dayTextDark,
                        !isSameMonth(day, currentMonth) && isDark && styles.outsideMonthTextDark,
                        isDateInSelectedWeek(day) && isDark && styles.selectedDayTextDark,
                        isPastDay && styles.pastDayText, // Appliquer la transparence pour le texte des jours passés
                        themeStyles.text,
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                  </View>
                );
              })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        elevation: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  containerDark: {
    backgroundColor: '#03082F',
    // Supprimer les bordures pour garder le design épuré
    // borderWidth: 1,   <-- à retirer
    // borderColor: '#ffffff20', <-- à retirer
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  monthButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 16,
    color: '#03082F',
    textTransform: 'capitalize',
  },
  monthTitleDark: {
    color: '#ffffff',
  },
  weekDays: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#03082F80',
  },
  weekDayTextDark: {
    color: '#ffffff80',
  },
  calendar: {
    padding: 8,
    // Supprimer les bordures ici
    // borderWidth: 1, <-- à retirer
    // borderColor: '...' <-- à retirer
  },
  week: {
    flexDirection: 'row',
    marginVertical: 2,
    borderRadius: 8,
  },
  weekDark: {
    backgroundColor: '#03082F',
  },
  selectedWeek: {
    backgroundColor: '#03082F10',
  },
  selectedWeekDark: {
    backgroundColor: '#ffffff10',
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: 8,
  },
  dayDark: {
    backgroundColor: '#03082F',
  },
  selectedDay: {
    backgroundColor: '#03082F',
  },
  selectedDayDark: {
    backgroundColor: '#ffffff',
  },
  dayText: {
    fontSize: 14,
    color: '#03082F',
  },
  dayTextDark: {
    color: '#ffffff',
  },
  selectedDayText: {
    color: '#ffffff',
  },
  selectedDayTextDark: {
    color: '#03082F',
  },

  pastDay: {
    opacity: 0.3, // Transparence pour les jours passés
  },
  pastDayText: {
    opacity: 0.3, // Transparence pour le texte des jours passés
  },
});

