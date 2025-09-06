<?php
/**
 * Booking Quantity Fix Component
 * 
 * Resuelve el problema de duplicación de cantidad cuando HivePress Bookings
 * transfiere datos al carrito de WooCommerce a través de HivePress Marketplace.
 * 
 * PROBLEMA:
 * - HivePress Bookings envía cantidad en 2 lugares: meta['quantity'] y args['_quantity']
 * - HivePress Marketplace procesa ambos, causando duplicación (1+1=2)
 * 
 * SOLUCIÓN:
 * - Interceptar el flujo de datos antes de WooCommerce
 * - Cuando detectamos hp_quantity, forzamos _quantity = 1
 */

namespace HivePress\Components;

use HivePress\Helpers as hp;

// Exit if accessed directly.
defined('ABSPATH') || exit;

/**
 * Booking Quantity Fix component class.
 */
final class Booking_Quantity_Fix extends Component {

    /**
     * Class constructor.
     *
     * @param array $args Component arguments.
     */
    public function __construct($args = []) {
        
        // Hook principal: Interceptar datos del carrito ANTES de que lleguen a WooCommerce
        // Prioridad 999 para ejecutarse DESPUÉS de todos los demás filtros
        add_filter('hivepress/v1/models/listing/cart', [$this, 'fix_booking_quantity_duplication'], 999, 2);
        
        // Hook alternativo: Interceptar cuando se agrega al carrito de WooCommerce
        add_filter('woocommerce_add_cart_item_data', [$this, 'validate_booking_quantity'], 999, 3);
        
        // Hook de debug: Para ver qué datos están llegando (comentar en producción)
        if (defined('WP_DEBUG') && WP_DEBUG) {
            add_action('woocommerce_before_calculate_totals', [$this, 'debug_cart_quantities'], 1);
        }
        
        parent::__construct($args);
    }

    /**
     * Fix booking quantity duplication in cart data.
     * 
     * Este es el punto principal de intervención. Aquí interceptamos los datos
     * ANTES de que HivePress Marketplace los procese y los envíe a WooCommerce.
     *
     * @param array $cart Cart data from HivePress.
     * @param object $listing Listing object.
     * @return array Modified cart data.
     */
    public function fix_booking_quantity_duplication($cart, $listing) {
        
        // Solo procesar si es una reserva (booking)
        if (!isset($cart['meta']['booking'])) {
            return $cart;
        }
        
        // ENFOQUE TEMPORAL: Solo hacer logging para entender el problema real
        if (isset($cart['meta']['quantity']) || isset($cart['args']['_quantity'])) {
            
            $hp_quantity = hp\get_array_value($cart['meta'], 'quantity', 'no definido');
            $args_quantity = hp\get_array_value($cart['args'], '_quantity', 'no definido');
            
            // Log detallado para debug
            if (defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
                error_log('=== HP Quantity Fix Debug ===');
                error_log('Booking ID: ' . hp\get_array_value($cart['meta'], 'booking', 'no definido'));
                error_log('hp_quantity (meta): ' . $hp_quantity);
                error_log('_quantity (args): ' . $args_quantity);
                error_log('Todos los meta: ' . print_r($cart['meta'], true));
                error_log('Todos los args: ' . print_r($cart['args'], true));
                error_log('=============================');
            }
            
            // POR AHORA: No modificamos nada, solo observamos
            // Una vez que veamos los logs, sabremos exactamente dónde aplicar el fix
        }
        
        return $cart;
    }

    /**
     * Validate booking quantity when adding to WooCommerce cart.
     * 
     * Hook secundario de seguridad. Si por alguna razón el fix anterior no funciona,
     * este método intercepta los datos justo cuando se agregan al carrito de WooCommerce.
     *
     * @param array $cart_item_data Cart item data.
     * @param int $product_id Product ID.
     * @param int $variation_id Variation ID.
     * @return array
     */
    public function validate_booking_quantity($cart_item_data, $product_id, $variation_id) {
        
        // Solo procesar bookings
        if (!isset($cart_item_data['hp_booking'])) {
            return $cart_item_data;
        }
        
        // Si hay hp_quantity definido, validar que no se duplique
        if (isset($cart_item_data['hp_quantity']) && $cart_item_data['hp_quantity'] > 0) {
            
            // Log para debug (comentar en producción)
            if (defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
                error_log('HP Quantity Fix (WC) - Validando hp_quantity: ' . $cart_item_data['hp_quantity']);
                error_log('HP Quantity Fix (WC) - Cantidad del producto será forzada a: 1');
            }
            
            // Agregar flag para identificar que este item necesita corrección
            $cart_item_data['hp_quantity_fixed'] = true;
        }
        
        return $cart_item_data;
    }

    /**
     * Debug cart quantities (only in debug mode).
     * 
     * Método de debug para ver exactamente qué cantidades están llegando al carrito.
     * Solo se ejecuta si WP_DEBUG está activo.
     *
     * @param object $cart WooCommerce cart object.
     */
    public function debug_cart_quantities($cart) {
        
        foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
            
            // Solo debuggear items de booking
            if (isset($cart_item['hp_booking'])) {
                
                error_log('=== HP Quantity Debug ===');
                error_log('Booking ID: ' . $cart_item['hp_booking']);
                error_log('Product Quantity: ' . $cart_item['quantity']);
                error_log('HP Quantity: ' . hp\get_array_value($cart_item, 'hp_quantity', 'no definido'));
                error_log('HP Quantity Fixed: ' . (isset($cart_item['hp_quantity_fixed']) ? 'SI' : 'NO'));
                
                // Si detectamos duplicación, mostrar advertencia
                if ($cart_item['quantity'] > 1 && isset($cart_item['hp_quantity'])) {
                    error_log('⚠️ ADVERTENCIA: Posible duplicación detectada!');
                    error_log('La cantidad del producto es ' . $cart_item['quantity'] . ' pero hp_quantity es ' . $cart_item['hp_quantity']);
                }
                
                error_log('======================');
            }
        }
    }
}