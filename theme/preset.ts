/**
 * Customized theme preset definitions for "PullLog".
 */
import { definePreset } from "@primeuix/themes"
/**
 * Aura is a dark theme that is designed to be easy on the eyes and provide a more immersive experience.
 * It is based on the Material Design guidelines and uses a dark color palette with vibrant accent colors.
 */
import Aura from "@primeuix/themes/aura"
/**
 * Lara is the default theme for PrimeVue, and it is used in the documentation and examples.
 * It is a light theme with a clean and modern design based on Bootstrap.
 */
import Lara from "@primeuix/themes/lara"
/**
 * This theme is follows Google Material Design v2.
 */
import Material from "@primeuix/themes/material"
/**
 * This theme is inspired by the design of the iOS operating system.
 * It uses a light color palette with soft gradients and rounded corners.
 */
import Nora from "@primeuix/themes/nora"

// The theme to reference as the base for customization:
const refTheme = Aura

export const PullLogPreset = definePreset(refTheme, {
    name: "PullLog",
    semantic: {
        primary: {
            50: "{violet.50}",
            100: "{violet.100}",
            200: "{violet.200}",
            300: "{violet.300}",
            400: "{violet.400}",
            500: "{violet.500}",
            600: "{violet.600}",
            700: "{violet.700}",
            800: "{violet.800}",
            900: "{violet.900}",
            950: "{violet.950}",
        },
        focusRing: {
            width: "2px",
            style: "dashed",
            color: "{primary.color}",
            offset: "1px",
        },
        colorScheme: {
            light: {
                surface: {
                    0: "#ffffff",
                    50: "{neutral.50}",
                    100: "{neutral.100}",
                    200: "{neutral.200}",
                    300: "{neutral.300}",
                    400: "{neutral.400}",
                    500: "{neutral.500}",
                    600: "{neutral.600}",
                    700: "{neutral.700}",
                    800: "{neutral.800}",
                    900: "{neutral.900}",
                    950: "{neutral.950}",
                },
                primary: {
                    color: "{primary.600}",
                    inverseColor: "#ffffff",
                    contrastColor: "#ffffff",
                    hoverColor: "{primary.700}",
                    activeColor: "{primary.800}",
                },
                highlight: {
                    background: "{primary.50}",
                    focusBackground: "{primary.100}",
                    color: "{primary.700}",
                    focusColor: "{primary.800}",
                },
            },
            dark: {
                surface: {
                    0: "#ffffff",
                    50: "{stone.50}",
                    100: "{stone.100}",
                    200: "{stone.200}",
                    300: "{stone.300}",
                    400: "{stone.400}",
                    500: "{stone.500}",
                    600: "{stone.600}",
                    700: "{stone.700}",
                    800: "{stone.800}",
                    900: "{stone.900}",
                    950: "{stone.950}",
                },
                primary: {
                    color: "{primary.500}",
                    inverseColor: "{surface.950}",
                    contrastColor: "{surface.900}",
                    hoverColor: "{primary.400}",
                    activeColor: "{primary.300}",
                },
                highlight: {
                    background:
                        "color-mix(in srgb, {primary.400}, transparent 84%)",
                    focusBackground:
                        "color-mix(in srgb, {primary.400}, transparent 76%)",
                    color: "rgba(255,255,255,.87)",
                    focusColor: "rgba(255,255,255,.87)",
                },
            },
        },
    },
})
