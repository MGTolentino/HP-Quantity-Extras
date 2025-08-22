(function($) {
    'use strict';

    $(document).ready(function() {
        // Función para restaurar valores de select después de clonación
        function fixClonedSelects() {
            // Buscar todos los contenedores de repeater de price extras
            const repeaterContainers = $('.hp-form__field--group[data-name*="price_extras"], .hp-form__field--repeat[data-name*="price_extras"]');
            
            repeaterContainers.each(function() {
                const container = $(this);
                
                // Observar cambios en el DOM para detectar elementos clonados
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            // Delay para asegurar que el elemento esté completamente renderizado
                            setTimeout(function() {
                                fixSelectValues(container);
                            }, 100);
                        }
                    });
                });
                
                observer.observe(container[0], {
                    childList: true,
                    subtree: true
                });
            });
        }
        
        // Función para corregir valores de select en elementos clonados
        function fixSelectValues(container) {
            const selects = container.find('select[name*="[type]"]');
            
            selects.each(function() {
                const select = $(this);
                const currentValue = select.val();
                
                // Si el select no tiene valor o está vacío, revisar si debe tener 'variable_quantity'
                if (!currentValue || currentValue === '') {
                    // Buscar el option de variable_quantity
                    const variableQuantityOption = select.find('option[value="variable_quantity"]');
                    
                    if (variableQuantityOption.length > 0) {
                        // Si existe la opción pero no está seleccionada, verificar contexto
                        // Esto puede requerir lógica específica según tu caso de uso
                        
                        // Opcionalmente, puedes forzar la selección si detectas cierto patrón
                        // select.val('variable_quantity').trigger('change');
                    }
                }
                
                // Asegurar que el select mantenga su apariencia normal
                select.removeClass('disabled').prop('disabled', false);
            });
        }
        
        // También manejar clicks en botones de "añadir elemento"
        $(document).on('click', '.hp-form__button--add, .hp-form__field--add', function() {
            const button = $(this);
            const container = button.closest('.hp-form__field--group, .hp-form__field--repeat');
            
            // Delay para permitir que se complete la clonación
            setTimeout(function() {
                fixSelectValues(container);
            }, 200);
        });
        
        // Inicializar inmediatamente para elementos existentes
        fixClonedSelects();
    });

})(jQuery);