(function($) {
    'use strict';

    // Override del método de HivePress que causa el error
    if (typeof hivepress !== 'undefined' && hivepress.initUI) {
        const originalInitUI = hivepress.initUI;
        
        hivepress.initUI = function(b) {
            // Wrap la función original para manejar errores
            try {
                // Modificar temporalmente el comportamiento del repeater
                const originalRepeaterHandler = $.fn.on;
                
                // Interceptar el manejo del repeater
                $(document).off('click', '[data-add]');
                
                // Re-definir el handler del repeater con manejo de errores
                $(document).on('click', '[data-add]', function(e) {
                    const button = $(this);
                    const repeater = button.closest('[data-component="repeater"]');
                    
                    if (repeater.length) {
                        const tbody = repeater.find('tbody');
                        const firstRow = tbody.find('tr:first');
                        
                        if (firstRow.length) {
                            // Clonar la fila
                            const newRow = firstRow.clone();
                            const randomId = Math.random().toString(36).slice(2);
                            
                            // Procesar cada input con manejo de errores
                            newRow.find(':input').each(function() {
                                const input = $(this);
                                const inputName = input.attr('name');
                                
                                // Solo procesar si tiene un name
                                if (inputName && inputName !== '') {
                                    try {
                                        // Buscar el patrón [xxx] de forma segura
                                        const matches = inputName.match(/\[([^\]]+)\]/);
                                        
                                        if (matches && matches[1]) {
                                            // Reemplazar el ID antiguo con el nuevo
                                            const newName = inputName.replace(matches[1], randomId);
                                            input.attr('name', newName);
                                        }
                                    } catch (err) {
                                        console.warn('Error processing input name:', err);
                                        // Si hay error, asignar un name genérico
                                        input.attr('name', 'price_extras[' + randomId + '][value]');
                                    }
                                } else {
                                    // Si no tiene name, crear uno
                                    const parentName = repeater.find('[data-name]').data('name') || 'price_extras';
                                    input.attr('name', parentName + '[' + randomId + '][value]');
                                }
                                
                                // Limpiar valores
                                if (input.attr('type') === 'checkbox') {
                                    input.prop('checked', false);
                                    // Generar nuevo ID para checkboxes
                                    const newId = 'a' + Math.random().toString(36).slice(2);
                                    input.attr('id', newId);
                                    input.closest('label').attr('for', newId);
                                } else {
                                    input.val('');
                                }
                            });
                            
                            // Agregar la nueva fila
                            newRow.appendTo(tbody);
                            
                            // Inicializar componentes en la nueva fila
                            if (typeof hivepress !== 'undefined' && hivepress.initUI) {
                                hivepress.initUI(newRow);
                            }
                        }
                    }
                    
                    e.preventDefault();
                });
                
                // Llamar a la función original
                originalInitUI.call(this, b);
                
            } catch (error) {
                console.error('Error in HivePress initUI:', error);
                // Intentar continuar con la inicialización básica
                if (b && b.length) {
                    b.find('[data-component]').each(function() {
                        try {
                            // Inicialización básica de componentes
                            const component = $(this);
                            const componentType = component.data('component');
                            
                            if (componentType === 'select' && $.fn.select2) {
                                component.select2({
                                    width: '100%',
                                    minimumResultsForSearch: 20
                                });
                            }
                        } catch (e) {
                            console.warn('Component initialization failed:', e);
                        }
                    });
                }
            }
        };
    }

    // Manejo global de errores para el match
    const originalMatch = String.prototype.match;
    String.prototype.match = function(regexp) {
        try {
            if (this === undefined || this === null) {
                console.warn('Match called on undefined/null string');
                return null;
            }
            return originalMatch.call(this, regexp);
        } catch (e) {
            console.error('Match error:', e);
            return null;
        }
    };

})(jQuery);