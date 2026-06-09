import { computed } from 'vue'
import { darkTheme, type GlobalTheme, type GlobalThemeOverrides } from 'naive-ui'
import { useTheme } from './useTheme'

const appFontFamily = [
  "'Noto Sans SC'",
  '-apple-system',
  'BlinkMacSystemFont',
  "'SF Pro Text'",
  "'Segoe UI Variable Text'",
  "'Segoe UI Variable'",
  "'Segoe UI'",
  "'PingFang SC'",
  "'Hiragino Sans GB'",
  "'Microsoft YaHei UI'",
  "'Microsoft YaHei'",
  'sans-serif'
].join(', ')

export function useNaiveTheme() {
  const { isDark } = useTheme()

  const naiveTheme = computed<GlobalTheme | null>(() => isDark.value ? darkTheme : null)

  const naiveThemeOverrides = computed<GlobalThemeOverrides>(() => {
    const primaryColor = isDark.value ? '#64b5f6' : '#1d9bf0'
    const primaryHover = isDark.value ? '#8ac7ff' : '#1a8cd8'
    const primaryPressed = isDark.value ? '#4fa2e8' : '#0f7ec5'
    const primaryContrast = isDark.value ? '#101014' : '#ffffff'
    const surfaceColor = isDark.value ? '#18181c' : '#ffffff'
    const surfaceMutedColor = isDark.value ? '#202024' : '#f7f9f9'
    const borderColor = isDark.value ? '#34343a' : '#eff3f4'
    const textColor = isDark.value ? '#ffffffd1' : '#0f1419'
    const textMutedColor = isDark.value ? '#ffffff9e' : '#536471'
    const infoColor = primaryColor
    const infoHover = primaryHover
    const infoPressed = primaryPressed
    const successColor = isDark.value ? '#63e2b7' : '#00ba7c'
    const warningColor = isDark.value ? '#f2c97d' : '#f0a23a'
    const errorColor = isDark.value ? '#e88080' : '#f4212e'

    return {
      common: {
        fontFamily: appFontFamily,
        fontFamilyMono: 'Cascadia Code, JetBrains Mono, SFMono-Regular, Consolas, monospace',
        primaryColor,
        primaryColorHover: primaryHover,
        primaryColorPressed: primaryPressed,
        primaryColorSuppl: primaryHover,
        infoColor,
        infoColorHover: infoHover,
        infoColorPressed: infoPressed,
        infoColorSuppl: infoHover,
        successColor,
        successColorHover: isDark.value ? '#7fe8c6' : '#00a870',
        successColorPressed: isDark.value ? '#4fd0a5' : '#008f5d',
        successColorSuppl: isDark.value ? '#7fe8c6' : '#00a870',
        warningColor,
        warningColorHover: isDark.value ? '#ffd99a' : '#d88f2f',
        warningColorPressed: isDark.value ? '#d9b469' : '#bd7a24',
        warningColorSuppl: isDark.value ? '#ffd99a' : '#d88f2f',
        errorColor,
        errorColorHover: isDark.value ? '#f09a9a' : '#d91c27',
        errorColorPressed: isDark.value ? '#d66e6e' : '#b91822',
        errorColorSuppl: isDark.value ? '#f09a9a' : '#d91c27',
        borderRadius: '8px',
        borderColor,
        bodyColor: isDark.value ? '#101014' : '#f7f9f9',
        cardColor: surfaceColor,
        modalColor: surfaceColor,
        popoverColor: surfaceColor,
        textColorBase: textColor,
        textColor1: textColor,
        textColor2: textMutedColor,
        textColor3: isDark.value ? '#ffffff73' : '#82909b'
      },
      Card: {
        color: surfaceColor,
        colorEmbedded: surfaceMutedColor,
        borderRadius: '8px',
        paddingMedium: '20px'
      },
      Button: {
        borderRadiusMedium: '6px',
        borderRadiusSmall: '6px',
        fontWeight: '500',
        color: isDark.value ? '#202024' : '#ffffff',
        colorHover: isDark.value ? '#2a2a30' : '#ffffff',
        colorPressed: isDark.value ? '#18181c' : '#ffffff',
        colorFocus: isDark.value ? '#2a2a30' : '#ffffff',
        textColor: isDark.value ? '#ffffffd1' : '#0f1419',
        textColorHover: primaryHover,
        textColorPressed: primaryPressed,
        textColorFocus: primaryHover,
        border: isDark.value ? '1px solid #34343a' : `1px solid ${borderColor}`,
        borderHover: `1px solid ${primaryHover}`,
        borderPressed: `1px solid ${primaryPressed}`,
        borderFocus: `1px solid ${primaryHover}`,
        rippleColor: isDark.value ? 'rgba(100, 181, 246, 0.16)' : 'rgba(29, 155, 240, 0.14)',
        textColorPrimary: primaryContrast,
        textColorHoverPrimary: primaryContrast,
        textColorPressedPrimary: primaryContrast,
        textColorFocusPrimary: primaryContrast,
        textColorInfo: primaryContrast,
        textColorHoverInfo: primaryContrast,
        textColorPressedInfo: primaryContrast,
        textColorFocusInfo: primaryContrast,
        textColorSuccess: primaryContrast,
        textColorHoverSuccess: primaryContrast,
        textColorPressedSuccess: primaryContrast,
        textColorFocusSuccess: primaryContrast,
        textColorWarning: primaryContrast,
        textColorHoverWarning: primaryContrast,
        textColorPressedWarning: primaryContrast,
        textColorFocusWarning: primaryContrast,
        textColorError: primaryContrast,
        textColorHoverError: primaryContrast,
        textColorPressedError: primaryContrast,
        textColorFocusError: primaryContrast
      },
      Input: {
        color: surfaceMutedColor,
        colorFocus: surfaceColor,
        border: `1px solid ${borderColor}`,
        borderFocus: `1px solid ${primaryColor}`,
        borderHover: `1px solid ${primaryHover}`,
        borderRadius: '6px'
      },
      Select: {
        peers: {
          InternalSelection: {
            color: surfaceMutedColor,
            border: `1px solid ${borderColor}`,
            borderFocus: `1px solid ${primaryColor}`,
            borderHover: `1px solid ${primaryHover}`,
            borderRadius: '6px'
          }
        }
      },
      Checkbox: {
        color: surfaceMutedColor,
        colorChecked: primaryColor,
        colorTableHeader: surfaceMutedColor,
        border: `1px solid ${borderColor}`,
        borderChecked: `1px solid ${primaryColor}`,
        borderFocus: `1px solid ${primaryColor}`,
        boxShadowFocus: `0 0 0 3px ${isDark.value ? 'rgba(100, 181, 246, 0.18)' : 'rgba(29, 155, 240, 0.16)'}`,
        borderRadius: '4px',
        checkMarkColor: primaryContrast,
        textColor: textMutedColor
      },
      Radio: {
        color: surfaceMutedColor,
        colorActive: surfaceMutedColor,
        buttonColorActive: primaryColor,
        buttonTextColorActive: primaryContrast,
        buttonBorderColorActive: primaryColor,
        dotColorActive: primaryColor,
        boxShadowFocus: `0 0 0 3px ${isDark.value ? 'rgba(100, 181, 246, 0.18)' : 'rgba(29, 155, 240, 0.16)'}`,
        buttonBoxShadowFocus: `0 0 0 3px ${isDark.value ? 'rgba(100, 181, 246, 0.18)' : 'rgba(29, 155, 240, 0.16)'}`,
        textColor: textMutedColor
      },
      Switch: {
        railColor: isDark.value ? '#34343a' : '#dce3e8',
        railColorActive: primaryColor,
        buttonColor: isDark.value ? '#ffffffd1' : '#ffffff',
        boxShadowFocus: `0 0 0 3px ${isDark.value ? 'rgba(100, 181, 246, 0.18)' : 'rgba(29, 155, 240, 0.16)'}`
      },
      Slider: {
        fillColor: primaryColor,
        fillColorHover: primaryHover,
        handleColor: primaryColor,
        handleColorHover: primaryHover,
        railColor: isDark.value ? '#34343a' : '#eff3f4',
        railColorHover: isDark.value ? '#4a4a52' : '#dce3e8',
        handleBoxShadowFocus: `0 0 0 3px ${isDark.value ? 'rgba(100, 181, 246, 0.18)' : 'rgba(29, 155, 240, 0.16)'}`,
        dotBorderActive: `2px solid ${primaryColor}`
      },
      Progress: {
        fillColor: primaryColor,
        fillColorInfo: infoColor,
        fillColorSuccess: successColor,
        fillColorWarning: warningColor,
        fillColorError: errorColor,
        railColor: isDark.value ? '#34343a' : '#eff3f4',
        textColorCircle: textColor,
        textColorLineInner: primaryContrast,
        textColorLineOuter: textMutedColor
      },
      Tabs: {
        tabTextColorActiveLine: primaryColor,
        tabTextColorHoverLine: primaryHover,
        barColor: primaryColor
      }
    }
  })

  return {
    naiveTheme,
    naiveThemeOverrides
  }
}
