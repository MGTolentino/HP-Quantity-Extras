(function($) {
    'use strict';

    $(document).ready(function() {
        // Variable para controlar si ya estamos procesando un click
        var isProcessingClick = false;
        
        // Función para asegurar que variable_quantity esté disponible en todos los selects
        function ensureVariableQuantityOption() {
            // Buscar SOLO los selects de price_extras, no todos los repeaters
            $('[data-component="repeater"]').each(function() {
                var $repeater = $(this);
                var $firstRow = $repeater.find('tbody tr:first');
                
                // Solo procesar si es un repeater de price_extras
                if ($firstRow.find('input[name*="price_extras"], select[name*="price_extras"], textarea[name*="price_extras"]').length > 0) {
                    $repeater.find('select[name*="[type]"]').each(function() {
                        var $select = $(this);
                        
                        // Si no tiene la opción variable_quantity, agregarla
                        if ($select.find('option[value="variable_quantity"]').length === 0) {
                            $select.append('<option value="variable_quantity">Variable Quantity</option>');
                        }
                        
                        // Asegurar que el select esté habilitado
                        $select.prop('disabled', false).removeClass('disabled');
                    });
                }
            });
        }

        // Función para corregir el handler del repeater después de que hivepress-extras lo modifique
        function fixRepeaterHandler() {
            // Primero, asegurar que todas las opciones estén disponibles
            ensureVariableQuantityOption();
            
            // Remover TODOS los handlers existentes (tanto de HivePress como de hivepress-extras)
            $(document).off('click', '[data-component="repeater"] [data-add]');
            $(document).off('click.customRepeater', '[data-component="repeater"] [data-add]');
            
            // Agregar nuestro handler mejorado
            $(document).on('click', '[data-component="repeater"] [data-add]', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Evitar procesamiento duplicado
                if (isProcessingClick) return false;
                isProcessingClick = true;
                
                var $button = $(this);
                // IMPORTANTE: Usar el repeater específico donde se hizo click
                var $repeater = $button.closest('[data-component="repeater"]');
                var $tbody = $repeater.find('tbody');
                var $firstRow = $tbody.find('tr:first');
                
                // Verificar si este repeater es de price_extras
                var isExtraRepeater = $firstRow.find('input[name*="price_extras"], select[name*="price_extras"], textarea[name*="price_extras"]').length > 0;
                
                if (!$firstRow.length) {
                    isProcessingClick = false;
                    return false;
                }
                
                // Si NO es un repeater de price_extras, dejar que otros scripts lo manejen
                if (!isExtraRepeater) {
                    isProcessingClick = false;
                    return true; // Permitir que el evento continúe
                }
                
                try {
                    // Clonar la primera fila
                    var $newRow = $firstRow.clone();
                    var randomId = Math.random().toString(36).slice(2);
                    
                    // Limpiar elementos de select2
                    $newRow.find('.select2-container').remove();
                    $newRow.find('select[data-select2-id]').each(function() {
                        $(this).removeClass('select2-hidden-accessible')
                               .removeAttr('data-select2-id')
                               .removeAttr('aria-hidden')
                               .removeAttr('tabindex');
                    });
                    
                    // Procesar todos los inputs
                    $newRow.find(':input').each(function() {
                        var $input = $(this);
                        var name = $input.attr('name');
                        
                        // Asegurar que el campo tenga un name válido
                        if (!name || name === '') {
                            // Generar un name basado en el contexto
                            var $parent = $input.closest('[data-name]');
                            if ($parent.length) {
                                var baseName = $parent.data('name') || 'price_extras';
                                var fieldType = $input.is('select') ? 'type' : 'value';
                                name = baseName + '[temp][' + fieldType + ']';
                                $input.attr('name', name);
                            }
                        }
                        
                        // Solo procesar si name es válido
                        if (name && typeof name === 'string') {
                            try {
                                // Buscar el patrón [xxx] para reemplazar
                                var matches = name.match(/\[([^\]]+)\]/);
                                if (matches && matches[1]) {
                                    var newName = name.replace(matches[1], randomId);
                                    $input.attr('name', newName);
                                }
                            } catch (err) {
                                console.warn('Error procesando name:', err);
                            }
                        }
                        
                        // Limpiar valores (excepto para variable_quantity)
                        if ($input.attr('type') === 'checkbox') {
                            $input.prop('checked', false);
                            // Generar nuevo ID para checkboxes
                            var newId = 'cb_' + randomId + '_' + Math.random().toString(36).slice(2);
                            $input.attr('id', newId);
                            $input.closest('label').attr('for', newId);
                        } else if ($input.is('select')) {
                            // Para selects, asegurar que tengan todas las opciones
                            if ($input.attr('name') && $input.attr('name').indexOf('[type]') > -1) {
                                // Copiar opciones del select original
                                var $originalSelect = $firstRow.find('select[name*="[type]"]:first');
                                if ($originalSelect.length && $originalSelect.find('option').length > $input.find('option').length) {
                                    $input.html($originalSelect.html());
                                }
                                
                                // Asegurar que variable_quantity esté disponible
                                if ($input.find('option[value="variable_quantity"]').length === 0) {
                                    $input.append('<option value="variable_quantity">Variable Quantity</option>');
                                }
                            }
                            
                            // Resetear el valor
                            $input.val($input.find('option:first').val());
                        } else {
                            $input.val('');
                        }
                    });
                    
                    // Limpiar campos de imagen si existen
                    $newRow.find('.hp-field--price-extras-upload, .hp-field--multiple-file').each(function() {
                        var $field = $(this);
                        $field.find('.hp-field__previews').empty();
                        $field.find('input[type="hidden"].hp-field__value').val('');
                        $field.find('.hp-field__counter').text('(0/' + ($field.find('.hp-field__file').data('max-files') || 5) + ')');
                        $field.find('.hp-field__upload-button').removeClass('disabled');
                    });
                    
                    // Agregar la nueva fila al DOM
                    $newRow.appendTo($tbody);
                    
                    // Inicializar select2 en los nuevos selects
                    $newRow.find('select[data-component="select"]').each(function() {
                        var $select = $(this);
                        
                        // Asegurar que el select tenga todas las opciones necesarias
                        if ($select.attr('name') && $select.attr('name').indexOf('[type]') > -1) {
                            if ($select.find('option[value="variable_quantity"]').length === 0) {
                                $select.append('<option value="variable_quantity">Variable Quantity</option>');
                            }
                        }
                        
                        // Inicializar select2 si está disponible
                        if (typeof $.fn.select2 === 'function' && !$select.hasClass('select2-hidden-accessible')) {
                            $select.select2({
                                width: '100%',
                                minimumResultsForSearch: 20,
                                dropdownAutoWidth: false
                            });
                        }
                    });
                    
                    // Inicializar componentes de HivePress
                    if (typeof hivepress !== 'undefined' && hivepress.initUI) {
                        // Usar un pequeño delay para asegurar que el DOM esté listo
                        setTimeout(function() {
                            hivepress.initUI($newRow);
                        }, 100);
                    }
                    
                } catch (error) {
                    console.error('Error al agregar nueva fila:', error);
                } finally {
                    // Resetear el flag después de un pequeño delay
                    setTimeout(function() {
                        isProcessingClick = false;
                    }, 200);
                }
                
                return false;
            });
        }

        // Función para observar cambios en el DOM y re-aplicar nuestras correcciones
        function observeRepeaters() {
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1) { // Element node
                                var $node = $(node);
                                
                                // Si se agregó un repeater o contiene uno
                                if ($node.is('[data-component="repeater"]') || $node.find('[data-component="repeater"]').length) {
                                    // Re-aplicar nuestras correcciones
                                    setTimeout(function() {
                                        fixRepeaterHandler();
                                        ensureVariableQuantityOption();
                                    }, 100);
                                }
                                
                                // Si es una nueva fila de repeater
                                if ($node.is('tr') && $node.closest('[data-component="repeater"]').length) {
                                    // Solo procesar si es de price_extras
                                    var $repeater = $node.closest('[data-component="repeater"]');
                                    var $firstRowInRepeater = $repeater.find('tbody tr:first');
                                    var isExtraRow = $firstRowInRepeater.find('input[name*="price_extras"], select[name*="price_extras"], textarea[name*="price_extras"]').length > 0;
                                    
                                    if (isExtraRow) {
                                        // Asegurar que los selects tengan todas las opciones
                                        setTimeout(function() {
                                            $node.find('select[name*="[type]"]').each(function() {
                                                var $select = $(this);
                                                if ($select.find('option[value="variable_quantity"]').length === 0) {
                                                    $select.append('<option value="variable_quantity">Variable Quantity</option>');
                                                }
                                                $select.prop('disabled', false).removeClass('disabled');
                                            });
                                        }, 100);
                                    }
                                }
                            }
                        });
                    }
                });
            });
            
            // Observar cambios en todo el body
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Función principal de inicialización
        function initialize() {
            // Esperar un momento para asegurar que otros scripts se hayan cargado
            setTimeout(function() {
                fixRepeaterHandler();
                ensureVariableQuantityOption();
                observeRepeaters();
            }, 500);
            
            // Re-aplicar después de un segundo por si acaso
            setTimeout(function() {
                fixRepeaterHandler();
                ensureVariableQuantityOption();
            }, 1000);
        }

        // Inicializar
        initialize();

        // Re-inicializar cuando HivePress actualice el DOM
        $(document).on('hivepress:init', function(e, container) {
            setTimeout(function() {
                fixRepeaterHandler();
                ensureVariableQuantityOption();
            }, 100);
        });

        // También escuchar el evento ajaxComplete por si acaso
        $(document).ajaxComplete(function() {
            setTimeout(function() {
                ensureVariableQuantityOption();
            }, 500);
        });
        
        // Log para debugging
        console.log('HP Quantity Extras - Repeater Fix loaded and initialized');
    });

})(jQuery);