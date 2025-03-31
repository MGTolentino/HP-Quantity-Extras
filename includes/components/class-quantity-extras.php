<?php
namespace HivePress\Components;

use HivePress\Helpers as hp;
use HivePress\Models;
use HivePress\Emails;

// Exit if accessed directly.
defined('ABSPATH') || exit;

/**
* Quantity extras component class.
*/
final class Quantity_Extras extends Component {

   /**
    * Class constructor.
    *
    * @param array $args Component arguments.
    */
   public function __construct($args = []) {

       // Hooks para campos y formularios de listing
       add_filter('hivepress/v1/models/listing/fields', [$this, 'add_listing_fields'], 250, 2);
       add_filter('hivepress/v1/forms/listing_update', [$this, 'add_listing_fields'], 250, 2);
       add_filter('hivepress/v1/meta_boxes/listing_attributes', [$this, 'add_listing_fields'], 250);
       
       // Hook para el formulario de booking y carrito
       add_filter('hivepress/v1/forms/booking_make', [$this, 'alter_booking_form'], 20, 2);
       add_filter('hivepress/v1/models/listing/cart', [$this, 'filter_cart_data'], 10, 2);

       // Hooks para guardar extras con cantidad variable
       add_action('hivepress/v1/models/booking/create', [$this, 'save_variable_extras'], 10, 2);
       add_action('hivepress/v1/models/booking/update', [$this, 'save_variable_extras'], 10, 2);

       // Hook para agregar extras variables al carrito de WooCommerce
       add_filter('woocommerce_add_cart_item_data', [$this, 'add_variable_extras_to_cart_data'], 10, 3);
       
       parent::__construct($args);
   }

   /**
    * Add listing fields.
    *
    * @param array  $form Form arguments.
    * @param object $model Model object.
    * @return array
    */
   public function add_listing_fields($form, $model = null) {
       // Get settings
       $is_form = strpos(current_filter(), 'form');
       $is_model = strpos(current_filter(), 'model');

       // Get fields
       $fields = [];
       if ($is_model) {
           $fields = $form;
       } else {
           $fields = $form['fields'];
       }

       // Modify price extras fields
       if (get_option('hp_listing_allow_price_extras')) {
           if (isset($fields['price_extras']['fields']['type'])) {
               // Get current options
               $current_options = $fields['price_extras']['fields']['type']['options'];
               
               // Add our option
               $current_options['variable_quantity'] = esc_html_x('Variable Quantity', 'pricing', 'hp-quantity-extras');
               
               // Update options
               $fields['price_extras']['fields']['type']['options'] = $current_options;
           }
       }

       // Set fields
       if ($is_model) {
           $form = $fields;
       } else {
           $form['fields'] = $fields;
       }

       return $form;
   }

   /**
    * Alter booking form.
    *
    * @param array  $form_args Form arguments.
    * @param object $form Form object.
    * @return array
    */
    public function alter_booking_form($form_args, $form) {
        $booking = $form->get_model();
        
        if ($booking) {
            $listing = $booking->get_listing();
            
            if ($listing && $listing->get_price_extras()) {
                // Filtrar extras variables de los checkboxes
                if (isset($form_args['fields']['_extras']) && isset($form_args['fields']['_extras']['options'])) {
                    $form_args['fields']['_extras']['options'] = array_filter(
                        $form_args['fields']['_extras']['options'], 
                        function($index) use ($listing) {
                            $extras = $listing->get_price_extras();
                            return !isset($extras[$index]['type']) || $extras[$index]['type'] !== 'variable_quantity';
                        }, 
                        ARRAY_FILTER_USE_KEY
                    );
                }
    
                // Agregar campos numéricos (mantener código existente)
                $extras = $listing->get_price_extras();
                foreach ($extras as $index => $extra) {
                    if (isset($extra['type']) && $extra['type'] === 'variable_quantity') {
                        $field_key = '_variable_quantity_' . $index;
                        $form_args['fields'][$field_key] = [
                            'type' => 'number',
                            'min_value' => 0,
                            'max_value' => 100,
                            'default' => 0,
                            '_order' => isset($form_args['fields']['_extras']) ? $form_args['fields']['_extras']['_order'] : 100,
                            'label' => sprintf(
                                '%s (%s) %s',
                                esc_html($extra['name']),
                                hivepress()->woocommerce->format_price($extra['price']),
                                esc_html_x('variable quantity', 'pricing', 'hp-quantity-extras')
                            ),
                            '_parent' => 'hp-form__field--checkboxes',
                            'wrapper_class' => 'hp-form__field--number',
                        ];
                    }
                }
            }
        }
        
        return $form_args;
    }

   /**
    * Filter cart data.
    *
    * @param array $cart Cart data.
    * @param object $listing Listing object.
    * @return array
    */
   public function filter_cart_data($cart, $listing) {
	   
    
       $extras = $listing->get_price_extras();
       foreach ($extras as $index => $extra) {
           if (isset($extra['type']) && $extra['type'] === 'variable_quantity') {
               $quantity = absint(hp\get_array_value($cart['args'], '_variable_quantity_' . $index, 0));
               
               if ($quantity > 0) {
                   if (!isset($cart['args']['_extras'])) {
                       $cart['args']['_extras'] = [];
                   }
                   $cart['args']['_extras'][] = (string) $index;
                   
                   $extra_total = floatval($extra['price']) * ($quantity - 1);
                   if (!isset($cart['meta']['price_change'])) {
                       $cart['meta']['price_change'] = 0;
                   }
                   $cart['meta']['price_change'] += $extra_total;
                   
                   $cart['meta']['quantity_' . $index] = $quantity;
               }
           }
       }
    
       return $cart;
   }

   /**
    * Save variable extras.
    *
    * @param int $booking_id Booking ID.
    * @param array $args Arguments.
    */
   public function save_variable_extras($booking_id, $args) {
    if (!$booking_id) {
        return;
    }
    
    $booking = get_post($booking_id);
    if (!$booking || $booking->post_type !== 'hp_booking') {
        return;
    }

    $listing_id = hp\get_array_value($_REQUEST, 'listing');
    if (!$listing_id) {
        return;
    }

    $listing = Models\Listing::query()->get_by_id($listing_id);
    if (!$listing) {
        return;
    }

    $extras_to_save = [];
    $listing_extras = $listing->get_price_extras();

    foreach ($listing_extras as $index => $extra) {
        if (isset($extra['type']) && $extra['type'] === 'variable_quantity') {
            $quantity = absint(hp\get_array_value($_REQUEST, '_variable_quantity_' . $index, 0));
            
            // Solo agregar si la cantidad es mayor a 0
            if ($quantity > 0) {
                $extras_to_save[] = [
                    'name' => $extra['name'],
                    'price' => $extra['price'],
                    'type' => 'variable_quantity',
                    'quantity' => $quantity
                ];
            }
        }
    }

    // Siempre actualizar el meta, incluso si está vacío
    update_post_meta($booking_id, 'variable_quantity_extras', $extras_to_save);
}

   /**
    * Get cart meta for variable quantity extras.
    *
    * @param object $booking Booking object.
    * @param object $listing Listing object.
    * @return array
    */
   protected function get_variable_extras_cart_meta($booking, $listing) {
       
       $meta = [];
       
       $variable_extras = get_post_meta($booking->get_id(), 'variable_quantity_extras', true);
       
       if (!empty($variable_extras)) {
           foreach ($variable_extras as $extra) {
               $extra_total = floatval($extra['price']) * $extra['quantity'];
               
               if (!isset($meta['price_extras'])) {
                   $meta['price_extras'] = [];
               }
               
               $meta['price_extras'][] = sprintf(
                   '%s (%s) x%d',
                   esc_html($extra['name']),
                   hivepress()->woocommerce->format_price($extra['price']),
                   $extra['quantity']
               );
               
               if (!isset($meta['price_change'])) {
                   $meta['price_change'] = 0;
               }
               $meta['price_change'] += $extra_total;
           }
           
           if (!empty($meta['price_extras'])) {
               $meta['price_extras'] = implode(', ', $meta['price_extras']);
           }
       }
       
       return $meta;
   }

   /**
    * Add variable extras to cart data.
    *
    * @param array $cart_item_data Cart item data.
    * @param int $product_id Product ID.
    * @param int $variation_id Variation ID.
    * @return array
    */
   public function add_variable_extras_to_cart_data($cart_item_data, $product_id, $variation_id) {
	       
       // Verificar si hay un booking_id
       if (!isset($cart_item_data['hp_booking'])) {
           return $cart_item_data;
       }

       // Obtener booking
       $booking = Models\Booking::query()->get_by_id($cart_item_data['hp_booking']);

       // Verificar booking y su estado
       if (!$booking || $booking->get_status() !== 'draft' || !$booking->get_listing__id()) {

        return $cart_item_data;
       }

       // Verificar que el booking pertenece al usuario actual
       if (get_current_user_id() !== $booking->get_user__id()) {

        return $cart_item_data;
       }

       // Obtener y verificar listing
       $listing = $booking->get_listing();
       if (!$listing || $listing->get_status() !== 'publish' || !hivepress()->booking->is_booking_enabled($listing)) {

        return $cart_item_data;
       }

       // Obtener nuestros extras
       $variable_extras_meta = $this->get_variable_extras_cart_meta($booking, $listing);

       // Agregar nuestros extras al cart_item_data
       if (!empty($variable_extras_meta)) {
           // Si ya existe price_extras, concatenar
           if (isset($cart_item_data['hp_price_extras'])) {
               if (!empty($variable_extras_meta['price_extras'])) {
                   $cart_item_data['hp_price_extras'] .= ', ' . $variable_extras_meta['price_extras'];
               }
           } else {
               $cart_item_data['hp_price_extras'] = $variable_extras_meta['price_extras'];
           }

           // Agregar al price_change
           if (isset($variable_extras_meta['price_change'])) {
               if (!isset($cart_item_data['hp_price_change'])) {
                   $cart_item_data['hp_price_change'] = 0;
               }
               $cart_item_data['hp_price_change'] += $variable_extras_meta['price_change'];
           }
       }

       return $cart_item_data;
   }
}