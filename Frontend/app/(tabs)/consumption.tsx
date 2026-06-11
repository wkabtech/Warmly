import api from '../../utils/api';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Circle, G, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import * as d3 from 'd3';
import { Zap, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { SettingsButton } from '../../components/SettingsButton';
import { Logo } from '../../components/Logo';
import { useTheme } from '../../context/ThemeContext';
import { useState, useEffect, useMemo } from 'react';
import { format, addDays, addWeeks, addMonths, addYears, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PullToRefresh } from '../../components/PullToRefresh';
import { LoadingScreen } from '../../components/LoadingScreen';
import { BlurView } from 'expo-blur';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 400;
const CHART_PADDING = 30;
const CHART_WIDTH = SCREEN_WIDTH;


type Period = 'day' | 'week' | 'month' | 'year';

interface RoomData {
  name: string;
  consumption: string;
  color: string;
  percentage: number;
}

interface ConsumptionData {
  total: string;
  rooms: RoomData[];
  chartData: Array<{ day: string; value: number; date: string }>;
}


export default function ConsumptionScreen() {
  const { isDark, styles: themeStyles } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');
  const [apiData, setApiData] = useState<{ total: number; repartition: RoomData[] }>({ total: 0, repartition: [] });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
const [isFetching, setIsFetching] = useState(false);



const refreshData = async () => {
  setLoading(true);

  const MIN_LOADING_TIME = 1000; // 1 seconde minimum
  const start = Date.now();

  await fetchData(); // 👈 on attend que les données soient rechargées (je vais te montrer où extraire ça)

  const elapsed = Date.now() - start;
  const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

  setTimeout(() => {
    setLoading(false); // 👈 loading OFF après minimum 1 seconde
  }, remaining);
};


  const getDateRange = () => {
    switch (selectedPeriod) {
      case 'day':
        return format(currentDate, 'dd MMMM yyyy', { locale: fr });
      case 'week': {
        const start = startOfWeek(currentDate, { locale: fr });
        const end = addDays(start, 6);
        return `${format(start, 'dd MMM', { locale: fr })} - ${format(end, 'dd MMM yyyy', { locale: fr })}`;
      }
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: fr });
      case 'year':
        return format(currentDate, 'yyyy');
    }
  };

  const handlePrevious = () => {
    switch (selectedPeriod) {
      case 'day':
        setCurrentDate(prev => addDays(prev, -1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, -1));
        break;
      case 'month':
        setCurrentDate(prev => addMonths(prev, -1));
        break;
      case 'year':
        setCurrentDate(prev => addYears(prev, -1));
        break;
    }
  };

  const handleNext = () => {
    switch (selectedPeriod) {
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, 1));
        break;
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1));
        break;
      case 'year':
        setCurrentDate(prev => addYears(prev, 1));
        break;
    }
  };

  const [chartData, setChartData] = useState<Array<{ day: string; value: number; date: string }>>([]);

  const xScale = useMemo(() => d3.scaleBand()
    .domain(chartData.map(d => d.day))
    .range([CHART_PADDING, CHART_WIDTH - CHART_PADDING])
    .padding(0.5), [chartData]);

  const yScale = useMemo(() => d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.value) || 10])
    .range([CHART_HEIGHT - CHART_PADDING, CHART_PADDING])
    .nice(), [chartData]);

  const line = useMemo(() => d3.line<typeof chartData[0]>()
    .x(d => xScale(d.day)! + xScale.bandwidth() / 2)
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX), [xScale, yScale]);

  const pathData = line(chartData);

const fetchData = async () => {
  try {
    setIsFetching(true); // commence à flouter pendant fetch
    const response = await api.get(`consommations.php?period=${selectedPeriod}&date=${format(currentDate, 'yyyy-MM-dd')}`);
    const { total, repartition, chartData } = response.data;
    const mappedRepartition = repartition.map((room: any) => ({
      name: room.piece,
      consumption: room.consommation.toFixed(2),
      color: '#03082F',
      percentage: 100,
    }));

    setApiData({ total, repartition: mappedRepartition });
    setChartData(chartData || []);
  } catch (error) {
    console.error('Erreur lors de la récupération des données de consommation:', error);
  } finally {
    setIsFetching(false); // enlève le flou après fetch
  }
};


useEffect(() => {
  const load = async () => {
    const MIN_LOADING_TIME = 1000;
    const start = Date.now();

    await fetchData(); // on utilise fetchData qui gère isFetching déjà !

    const elapsed = Date.now() - start;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

    setTimeout(() => {
      setLoading(false);
    }, remaining);
  };

  load();
}, []);

useEffect(() => {
  fetchData(); // changement date/période = juste rafraîchir sans loading de 1s
}, [selectedPeriod, currentDate]);


  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <PullToRefresh
      onRefresh={refreshData}
      refreshing={loading}
      style={[styles.container, isDark && styles.containerDark]}
    >
      <ThemeToggle />
      <SettingsButton />
      <View style={styles.header}>
        <Logo />
      </View>

      <View style={styles.content}>
        <View style={[styles.mainCard, isDark && styles.mainCardDark]}>
          <View style={styles.mainCardHeader}>
            <View>
              <Text style={[styles.mainTitle, isDark && styles.mainTitleDark, themeStyles.textSemiBold]}>
                Consommation Globale
              </Text>
              <View style={{ position: 'relative' }}>
              <Text style={[styles.mainValue, isDark && styles.mainValueDark, themeStyles.textBold]}>
                {apiData.total} kWh
              </Text>
                {isFetching && (
                  <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType={isDark ? "light" : "dark"}
                    blurAmount={5}
                    reducedTransparencyFallbackColor="white"
                  />
                )}
              </View>
            </View>
            <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
              <Zap size={24} color={isDark ? '#ffffff' : '#03082F'} />
            </View>
          </View>

          <View style={styles.periodNavigation}>
            <Pressable
              style={[styles.periodNavigationButton, isDark && styles.periodNavigationButtonDark]}
              onPress={() => {
                const periods: Period[] = ['day', 'week', 'month', 'year'];
                const currentIndex = periods.indexOf(selectedPeriod);
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : periods.length - 1;
                setSelectedPeriod(periods[prevIndex]);
                setCurrentDate(new Date());
              }}
            >
              <ChevronLeft size={24} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>

            <View style={[styles.periodSelector, isDark && styles.periodSelectorDark]}>
              <Text style={[styles.periodText, isDark && styles.periodTextDark, themeStyles.textSemiBold]}>
                {selectedPeriod === 'day' ? 'Jour' :
                 selectedPeriod === 'week' ? 'Semaine' :
                 selectedPeriod === 'month' ? 'Mois' : 'Année'}
              </Text>
            </View>

            <Pressable
              style={[styles.periodNavigationButton, isDark && styles.periodNavigationButtonDark]}
              onPress={() => {
                const periods: Period[] = ['day', 'week', 'month', 'year'];
                const currentIndex = periods.indexOf(selectedPeriod);
                const nextIndex = currentIndex < periods.length - 1 ? currentIndex + 1 : 0;
                setSelectedPeriod(periods[nextIndex]);
                setCurrentDate(new Date());
              }}
            >
              <ChevronRight size={24} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
          </View>

          <View style={[styles.dateSelector, isDark && styles.dateSelectorDark]}>
            <Pressable onPress={handlePrevious} style={styles.dateButton}>
              <ChevronLeft size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
            <Text style={[styles.dateText, isDark && styles.dateTextDark, themeStyles.textMedium]}>
              {getDateRange()}
            </Text>
            <Pressable onPress={handleNext} style={styles.dateButton}>
              <ChevronRight size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
          </View>

          <View style={[styles.chart, { paddingLeft: 10, position: 'relative' }]}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={isDark ? '#ffffff' : '#03082F'} stopOpacity="0.4" />
                  <Stop offset="1" stopColor={isDark ? '#ffffff' : '#03082F'} stopOpacity="0" />
                </LinearGradient>
              </Defs>

              <SvgText
  x={CHART_PADDING - 30}
  y={yScale(yScale.ticks(5).at(-1) ?? 0) - 20}
                textAnchor="start"
                fontSize="12"
                fontWeight="bold"
                fill={isDark ? '#ffffff80' : '#03082F80'}
                fontFamily="PlusJakartaSans-Medium"
              >
                kWh
              </SvgText>

              {yScale.ticks(5).map((tick) => (
                <G key={tick}>
                  <Line
                    x1={CHART_PADDING}
                    y1={yScale(tick)}
                    x2={CHART_WIDTH - CHART_PADDING}
                    y2={yScale(tick)}
                    stroke={isDark ? '#ffffff20' : '#03082F20'}
                    strokeWidth="1"
                  />
                  <SvgText
                    x={CHART_PADDING - 8}
                    y={yScale(tick)}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill={isDark ? '#ffffff80' : '#03082F80'}
                    fontFamily="PlusJakartaSans-Medium"
                  >
                    {tick}
                  </SvgText>
                </G>
              ))}

              {pathData && (
                <Path
                  d={`${pathData} L ${CHART_WIDTH - CHART_PADDING} ${CHART_HEIGHT - CHART_PADDING} L ${CHART_PADDING} ${CHART_HEIGHT - CHART_PADDING}`}
                  fill="url(#lineGradient)"
                />
              )}

              {pathData && (
                <Path
                  d={pathData}
                  fill="none"
                  stroke={isDark ? '#ffffff' : '#03082F'}
                  strokeWidth="3"
                />
              )}

{chartData.map((d, index) => {
  const value = d.value.toFixed(1);
  const charWidth = 5.5; // un peu plus étroit
  const padding = 4; // léger padding
  const labelWidth = value.length * charWidth + padding;
if (selectedPeriod === 'day') {
  const hour = parseInt(d.day);
  if (hour % 2 !== 0) return null;
}

  return (
    <G key={d.day}>
      {/* ✅ Contour du label compact */}
      <Rect
        x={xScale(d.day)! + xScale.bandwidth() / 2 - labelWidth / 2 - 1}
        y={yScale(d.value) - 7.5}
        width={labelWidth + 2}
        height={15}
        rx={4}
        fill={isDark ? '#ffffff' : '#03082F'}
      />

      {/* ✅ Fond du label compact */}
      <Rect
        x={xScale(d.day)! + xScale.bandwidth() / 2 - labelWidth / 2}
        y={yScale(d.value) - 6.5}
        width={labelWidth}
        height={13}
        rx={3}
        fill={isDark ? '#03082F' : '#ffffff'}
      />

      {/* ✅ Texte */}
      <SvgText
        x={xScale(d.day)! + xScale.bandwidth() / 2}
        y={yScale(d.value) + 4}
        textAnchor="middle"
        fontSize="9"
        fontWeight="bold"
        fill={isDark ? '#ffffff' : '#03082F'}
        fontFamily="PlusJakartaSans-Medium"
      >
        {value}
      </SvgText>

      {/* ✅ Label abscisse */}
      {(selectedPeriod !== 'day' || xScale.bandwidth() > 20 || parseInt(d.day) % 2 === 0) && (
        <SvgText
          x={xScale(d.day)! + xScale.bandwidth() / 2}
          y={CHART_HEIGHT - 10}
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill={isDark ? '#ffffff80' : '#03082F80'}
          fontFamily="PlusJakartaSans-Medium"
        >
          {d.day}
        </SvgText>
      )}
    </G>
  );
})}








              <Line
                x1={CHART_PADDING}
                y1={CHART_HEIGHT - CHART_PADDING}
                x2={CHART_WIDTH - CHART_PADDING}
                y2={CHART_HEIGHT - CHART_PADDING}
                stroke={isDark ? '#ffffff20' : '#03082F20'}
                strokeWidth="1"
              />
            </Svg>
  {isFetching && (
    <BlurView
      style={StyleSheet.absoluteFill}
      blurType={isDark ? "light" : "dark"}
      blurAmount={5}
      reducedTransparencyFallbackColor="white"
    />
  )}
</View>
        </View>

        <View style={[styles.roomsCard, isDark && styles.roomsCardDark]}>
          <Text style={[styles.roomsTitle, isDark && styles.roomsTitleDark, themeStyles.textSemiBold]}>
            Répartition par pièce
          </Text>
          <View style={styles.roomsList}>
            {apiData.repartition.map((room, index) => (
              <View key={index} style={[styles.roomItem, isDark && styles.roomItemDark]}>
                <View style={styles.roomInfo}>
                  <View style={[styles.roomDot, { backgroundColor: isDark ? '#ffffff' : '#03082F' }]} />
                  <Text style={[styles.roomName, isDark && styles.roomNameDark, themeStyles.textMedium]}>
                    {room.name}
                  </Text>
                </View>
                <View style={styles.roomStats}>
                  <Text style={[styles.roomConsumption, isDark && styles.roomConsumptionDark, themeStyles.textBold]}>
                    {room.consumption} kWh
                  </Text>
                  <Text style={[
                    styles.roomPercentage,
                    { color: isDark ? '#ffffff' : '#03082F' },
                    themeStyles.textMedium
                  ]}>
                    {<Text style={[styles.roomPercentage, { color: isDark ? '#ffffff' : '#03082F' }, themeStyles.textMedium]}>
                       {apiData.total > 0
                         ? `${((parseFloat(room.consumption) / apiData.total) * 100).toFixed(0)}%`
                         : '0%'}
                     </Text>}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </PullToRefresh>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#03082F',
  },
  header: {
    height: 100,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  mainCardDark: {
    backgroundColor: '#03082F',
    borderWidth: 0,
    borderColor: '#ffffff20',
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 16,
    color: '#03082F80',
    marginBottom: 4,
  },
  mainTitleDark: {
    color: '#ffffff80',
  },
  mainValue: {
    fontSize: 32,
    color: '#03082F',
  },
  mainValueDark: {
    color: '#ffffff',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#03082F20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDark: {
    backgroundColor: '#ffffff20',
  },
  periodNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  periodNavigationButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
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
  periodNavigationButtonDark: {
    backgroundColor: '#03082F',
    borderWidth: 0,
    borderColor: '#ffffff20',
  },
  periodSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
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
  periodSelectorDark: {
    backgroundColor: '#03082F',
    borderWidth: 0,
    borderColor: '#ffffff20',
  },
  periodText: {
    fontSize: 16,
    color: '#03082F',
  },
  periodTextDark: {
    color: '#ffffff',
  },
  chart: {
    marginTop: 20,
    alignSelf: 'center',
  },
  roomsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
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
  roomsCardDark: {
    backgroundColor: '#03082F',
    borderWidth: 0,
    borderColor: '#ffffff20',
  },
  roomsTitle: {
    fontSize: 18,
    color: '#03082F',
    marginBottom: 16,
  },
  roomsTitleDark: {
    color: '#ffffff',
  },
  roomsList: {
    gap: 12,
  },
  roomItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      web: {
        elevation: 1,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
    }),
  },
  roomItemDark: {
    backgroundColor: '#ffffff05',
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  roomName: {
    fontSize: 16,
    color: '#03082F',
  },
  roomNameDark: {
    color: '#ffffff',
  },
  roomStats: {
    alignItems: 'flex-end',
  },
  roomConsumption: {
    fontSize: 18,
    color: '#03082F',
    marginBottom: 4,
  },
  roomConsumptionDark: {
    color: '#ffffff',
  },
  roomPercentage: {
    fontSize: 14,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    ...Platform.select({
      web: {
        elevation: 1,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
    }),
  },
  dateSelectorDark: {
    backgroundColor: '#03082F',
    borderWidth: 0,
    borderColor: '#ffffff10',
  },
  dateButton: {
    padding: 8,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#03082F',
    minWidth: 120,
    textAlign: 'center',
  },
  dateTextDark: {
    color: '#ffffff',
  },
});