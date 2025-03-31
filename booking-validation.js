(function($) {
    'use strict';

    $(document).ready(function() {
        // Obtener el formulario de reserva
        const bookingForm = $('form.hp-form--booking-make');
        const errorContainer = $('#hp-booking-price-error');
        
        if (bookingForm.length) {
            // Interceptar el formulario antes del submit
            bookingForm[0].addEventListener('submit', function(e) {
                // Prevenir el submit por defecto
                e.preventDefault();

                // Intentar obtener el precio de diferentes formas posibles
                let priceElement = $('.booking-price');
                if (!priceElement.length) {
                    priceElement = $('.hp-listing__attribute--price .hp-listing__attribute-value');
                }
                if (!priceElement.length) {
                    priceElement = $('[data-component="listing-price"]');
                }
                
                if (priceElement.length) {
                    // Obtener el texto del precio y limpiarlo
                    let priceText = priceElement.text().trim();
                    
                    // Remover cualquier símbolo de moneda y caracteres no numéricos
                    priceText = priceText.replace(/[^0-9.,]/g, '');
                    
                    // Convertir el precio a número
                    const price = parseFloat(priceText.replace(',', '.'));

                    // Validar si el precio es 0 o no es un número válido
                    if (price === 0 || isNaN(price)) {
                        // Mostrar mensaje de error
                        errorContainer
                            .text(hpQuantityExtras.messages.price_error)
                            .show();
                        
                        // Scroll suave hasta el mensaje de error
                        $('html, body').animate({
                            scrollTop: errorContainer.offset().top - 100
                        }, 500);
                        
                        return false;
                    }
                }

                // Si llegamos aquí, el precio es válido o no se encontró el elemento
                // Continuar con el submit
                this.submit();
            });

            // Ocultar mensaje de error cuando cambian los campos
            bookingForm.find('input, select').on('change', function() {
                errorContainer.hide();
            });

            // Ocultar mensaje de error cuando cambian las fechas o cantidad
            $(document).on('change', 'input[name="_dates[]"], input[name="_quantity"]', function() {
                errorContainer.hide();
            });

            // Ocultar mensaje de error cuando cambia cualquier select
            $(document).on('change', 'select', function() {
                errorContainer.hide();
            });
        }
    });

})(jQuery);