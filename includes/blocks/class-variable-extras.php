<?php
namespace HivePress\Blocks;

use HivePress\Helpers as hp;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Variable extras block class.
 */
class Variable_Extras extends Block {

    /**
     * Booking model.
     */
    protected $booking;

    /**
     * Class constructor.
     *
     * @param array $args Block arguments.
     */
    public function __construct( $args = [] ) {
        $args = hp\merge_arrays(
            [
                'booking' => null,
            ],
            $args
        );

        parent::__construct( $args );
    }

    /**
     * Renders block HTML.
     *
     * @return string
     */
    public function render() {

        if (!$this->booking) {
            return '';
        }

        // Get variable extras
        $variable_extras = get_post_meta($this->booking->get_id(), 'variable_quantity_extras', true);
        if (empty($variable_extras)) {
            return '';
        }

        $output = '';
        
        // Render cada extra
        foreach ($variable_extras as $extra) {
            $output .= '<div class="hp-listing__attribute hp-listing__attribute--variable-extras">';
            $output .= '<strong>' . esc_html__('Extra:', 'hp-quantity-extras') . '</strong> ';
            $output .= sprintf(
                '%s (%s) x%d',
                esc_html($extra['name']),
                hivepress()->woocommerce->format_price($extra['price']),
                $extra['quantity']
            );
            $output .= '</div>';
        }

        return $output;
    }
}