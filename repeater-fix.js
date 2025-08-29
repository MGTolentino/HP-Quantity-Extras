(function($) {
    'use strict';

    $(document).ready(function() {
        // Función para asegurar que todos los campos tengan atributo name
        function ensureFieldNames(container) {
            // Buscar todos los inputs sin name o con name vacío
            container.find(':input').each(function() {
                const field = $(this);
                const fieldName = field.attr('name');
                
                if (!fieldName || fieldName === '') {
                    // Generar un name basado en el contexto
                    const parent = field.closest('[data-name]');
                    if (parent.length) {
                        const baseName = parent.data('name');
                        const fieldType = field.attr('type') || field.prop('tagName').toLowerCase();
                        const randomId = Math.random().toString(36).slice(2);
                        
                        // Construir el name siguiendo el patrón de HivePress
                        let newName = baseName + '[' + randomId + ']';
                        
                        // Si es un select con type, usar ese patrón específico
                        if (field.is('select') && field.hasClass('hp-field__input--select')) {
                            newName = baseName + '[' + randomId + '][type]';
                        }
                        
                        field.attr('name', newName);
                        console.log('Added name attribute:', newName);
                    }
                }
            });
        }

        // Interceptar el click del botón añadir ANTES de que HivePress lo procese
        $(document).on('mousedown', '[data-add], .hp-form__button--add', function(e) {
            const button = $(this);
            const repeater = button.closest('[data-component="repeater"]');
            
            if (repeater.length) {
                // Asegurar que todos los campos en el repeater tengan name
                const firstRow = repeater.find('tbody tr:first');
                if (firstRow.length) {
                    ensureFieldNames(firstRow);
                    
                    // También asegurar que los selects tengan todas las opciones
                    firstRow.find('select[name*="[type]"]').each(function() {
                        const select = $(this);
                        
                        // Verificar si tiene la opción variable_quantity
                        if (select.find('option[value="variable_quantity"]').length === 0) {
                            // Agregar la opción si no existe
                            select.append('<option value="variable_quantity">Variable Quantity</option>');
                        }
                    });
                }
            }
        });

        // Función mejorada para arreglar selects clonados
        function fixClonedSelects(container) {
            // Primero asegurar que todos los campos tengan name
            ensureFieldNames(container);
            
            // Luego arreglar los selects específicamente
            container.find('select[name*="[type]"]').each(function() {
                const select = $(this);
                
                // Asegurar que el select tenga todas las opciones necesarias
                if (select.find('option[value="variable_quantity"]').length === 0) {
                    // Buscar un select hermano que sí tenga las opciones
                    const siblingSelect = container.find('select[name*="[type]"]:has(option[value="variable_quantity"])').first();
                    
                    if (siblingSelect.length) {
                        // Copiar las opciones del select hermano
                        siblingSelect.find('option').each(function() {
                            const option = $(this);
                            if (select.find('option[value="' + option.val() + '"]').length === 0) {
                                select.append(option.clone());
                            }
                        });
                    } else {
                        // Si no hay hermano, agregar la opción manualmente
                        select.append('<option value="variable_quantity">Variable Quantity</option>');
                    }
                }
                
                // Asegurar que el select esté habilitado
                select.prop('disabled', false).removeClass('disabled');
                
                // Si el select está vacío, seleccionar la primera opción disponible
                if (!select.val() && select.find('option').length > 0) {
                    select.val(select.find('option:first').val());
                }
            });
        }

        // Observer para detectar nuevos elementos agregados
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            const $node = $(node);
                            
                            // Si es una fila de repeater
                            if ($node.is('tr') && $node.closest('[data-component="repeater"]').length) {
                                setTimeout(function() {
                                    fixClonedSelects($node);
                                }, 50);
                            }
                            
                            // Si contiene elementos de repeater
                            if ($node.find('[data-component="repeater"]').length) {
                                $node.find('[data-component="repeater"] tbody tr').each(function() {
                                    fixClonedSelects($(this));
                                });
                            }
                        }
                    });
                }
            });
        });

        // Observar todo el body para cambios
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Arreglar elementos existentes al cargar
        $('[data-component="repeater"] tbody tr').each(function() {
            fixClonedSelects($(this));
        });

        // Hook adicional para manejar la inicialización de HivePress
        $(document).on('hivepress:init', function(e, container) {
            container.find('[data-component="repeater"] tbody tr').each(function() {
                fixClonedSelects($(this));
            });
        });
    });

})(jQuery);