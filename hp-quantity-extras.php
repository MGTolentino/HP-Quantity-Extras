<?php
/**
 * Plugin Name: HivePress Quantity Extras
 * Description: Añade campos de cantidad personalizados y validación de precio para HivePress Bookings
 * Version: 2.0.3
 * Author: Miguel Tolentino
 * Text Domain: hp-quantity-extras
 * Domain Path: /languages/
 */

// Exit if accessed directly.
defined('ABSPATH') || exit;

// Define plugin constants
define('HP_QUANTITY_EXTRAS_VERSION', '2.0.3');
define('HP_QUANTITY_EXTRAS_DIR', plugin_dir_path(__FILE__));
define('HP_QUANTITY_EXTRAS_URL', plugin_dir_url(__FILE__));

// Register extension directory
add_filter(
    'hivepress/v1/extensions',
    function($extensions) {
        $extensions[] = __DIR__;
        return $extensions;
    }
);

// Modify booking make form
add_filter(
    'hivepress/v1/forms/booking_make',
    function($form_args, $form) {
        // Verificar si el formulario tiene campos
        if (!isset($form_args['fields'])) {
            return $form_args;
        }

        // Obtener el listing del contexto actual
        $listing = null;
        if (isset($form_args['model']) && $form_args['model'] === 'booking') {
            $listing_id = get_query_var('listing_id', 0);
            if ($listing_id) {
                $listing = \HivePress\Models\Listing::query()->get_by_id($listing_id);
            }
        }

        if ($listing) {
            // Obtener min y max quantity
            $min_quantity = $listing->get_meta('hp_booking_min_quantity');
            $max_quantity = $listing->get_meta('hp_booking_max_quantity');

            // Convertir a enteros y establecer valores por defecto
            $min_quantity = $min_quantity ? (int) $min_quantity : 1;
            $max_quantity = $max_quantity ? (int) $max_quantity : 1;

            // Ocultar campo quantity si min y max son 1
            if ($min_quantity === 1 && $max_quantity === 1 && isset($form_args['fields']['_quantity'])) {
                unset($form_args['fields']['_quantity']);
            }
        }

        return $form_args;
    },
    20,
    2
);

// Add price validation script
function hp_quantity_extras_enqueue_scripts() {
    if (is_singular('hp_listing')) {
        wp_enqueue_script(
            'hp-quantity-extras-validation',
            HP_QUANTITY_EXTRAS_URL . 'booking-validation.js',
            ['jquery'],
            HP_QUANTITY_EXTRAS_VERSION,
            true
        );

        wp_localize_script(
            'hp-quantity-extras-validation',
            'hpQuantityExtras',
            [
                'messages' => [
                    'price_error' => esc_html__('El precio no puede ser 0', 'hp-quantity-extras'),
                ],
            ]
        );
    }
    
    // Agregar script para fix de repeaters en admin/listing forms
    if (is_admin() || is_page() || is_singular('hp_listing')) {
        wp_enqueue_script(
            'hp-quantity-extras-repeater-fix',
            HP_QUANTITY_EXTRAS_URL . 'repeater-fix.js',
            ['jquery', 'hivepress-core-frontend'], // Asegurar que se carga después de HivePress
            HP_QUANTITY_EXTRAS_VERSION . '.1', // Incrementar versión para forzar recarga
            true // Cargar en el footer
        );
        
        // Añadir prioridad alta para asegurar que se ejecute después de otros scripts
        add_action('wp_print_footer_scripts', function() {
            ?>
            <script>
            jQuery(document).ready(function($) {
                // Forzar re-inicialización después de que todos los scripts se hayan cargado
                setTimeout(function() {
                    if (typeof window.fixRepeaterHandler === 'function') {
                        window.fixRepeaterHandler();
                    }
                }, 1500);
            });
            </script>
            <?php
        }, 999);
    }
}
add_action('wp_enqueue_scripts', 'hp_quantity_extras_enqueue_scripts');

// Add error message container
add_action(
    'hivepress/v1/templates/booking_make_page/before_content',
    function() {
        echo '<div id="hp-booking-price-error" class="hp-form__messages" style="display:none;color:red;margin-bottom:10px;"></div>';
    }
);

// Register block for booking view page
add_filter(
    'hivepress/v1/templates/booking_view_page/blocks',
    function($blocks, $template) {
        $path = &$blocks['page_container']['blocks']['page_columns']['blocks']['page_sidebar']['blocks']['booking_sidebar']['blocks']['booking_attributes_primary']['blocks'];
        
        if (isset($path)) {
            $path['booking_variable_extras'] = [
                'type' => 'variable_extras',
                'booking' => hivepress()->request->get_context('booking'),
                '_order' => 15,
            ];
        }
        
        return $blocks;
    },
    10,
    2
);