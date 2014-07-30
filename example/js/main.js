require.config({
    paths: {
        'jquery': '../lib/jquery.min',
        'knockout': '../lib/knockout',
        'knockout.mapping': '../lib/knockout.mapping',
        'knockout.grid': '../../knockout.grid'
    },
    shim: {
    },
    waitSeconds: 15
});


require( [
    'jquery',
    'knockout',
    'knockout.grid'
], function($, ko, GridViewModel) {
    'use strict';

    var ViewModel = function() {
        var that = this;

        this.grid = new GridViewModel({
            columns: [
                { head: 'NO.', dataField: '_index', width: '35px'},
                { head: 'Product ID', dataField: 'ProSet.proId', filterType: 'textbox', width: '90px'},
                { head: 'Product Catgory', dataField: 'ProSet.proCategory', filterType: 'select'},
                { head: 'Product Description', dataField: 'ProSet.proDescription', width: '250px'},
                { head: 'Support Degree', dataField: 'supportDegree', sort: true, width: '80px', 'class': 'text_right',
                    body_bind: 'css: { "text-danger": $parent["support_flag"]() == 1 }'},
                { head: 'Confidence Degree', dataField: 'confidenceDegree', sort: true, width: '80px', 'class': 'text_right',
                    body_bind: 'css: { "text-danger": $parent["support_flag"]() == 1 }'},
                { head: 'Improve Degree', dataField: 'improveDegree', sort: true, width: '80px', 'class': 'text_right',
                    body_bind: 'css: { "text-danger": $parent["support_flag"]() == 1 }'},
                { head: 'Related Product ID', dataField: 'relatedProSet.proId', filterType: 'textbox'},
                { head: 'Related Product Catgory', dataField: 'relatedProSet.proCategory', filterType: 'select'},
                { head: 'Related Product Description', dataField: 'relatedProSet.proDescription'}
            ],
            ajaxRetrieveUrl: ko.computed(function () { return './json/getAssociationRealtimeForItem.json'; }),
            beforeMapping: function(data) {
                var support = data.support_threshold;
                var confidence = data.confidence_threshold;
                var improve = data.lift_threshold;
                data = data.AssociationList;
                ko.utils.arrayForEach(data, function(item) {
                    item.supportDegree = parseFloat(item.supportDegree.toFixed(4));
                    item.confidenceDegree = parseFloat(item.confidenceDegree.toFixed(4));
                    item.improveDegree = parseFloat(item.improveDegree.toFixed(4));

                    item.support_flag = item.supportDegree > support ? 1 : 0;
                    item.confidence_flag = item.confidenceDegree > confidence ? 1 : 0;
                    item.improve_flag = item.improveDegree > improve ? 1 : 0;

                    item.ProSet_length = item.ProSet.length;
                    item.relatedProSet_length = item.relatedProSet.length;
                });
                return data;
            },
            trClickEvent: function() {
                var $tr = $(event.target).parents('tr');
                if($tr.next().hasClass('additionalTR')) {
                    $tr.next().toggleClass('hide');
                }
                else {
                    $.getJSON('./json/getAssociationPCTforItem.json').done(function(data) {
                        setChartData(data[0], $tr);
                    });
                }
            },
            filters: {
                'ProSet_length': ko.observable(null).extend({ filterOperator: 'GreaterOrEqual'}),
                'relatedProSet_length': ko.observable(null).extend({ filterOperator: 'GreaterOrEqual'})
            },
            orderBy: 'item_id'
        });

        this.chartData = ko.observable(null);

        this.grid.models.subscribe(function() {
            $('.additionalTR').remove();
        });

        function setChartData(data, $element) {
            var p_amount = data.amt_avg ? data.asso_amt_avg.toFixed(2) / data.amt_avg.toFixed(2) : 999,
                p_number = data.num_avg ? data.asso_num_avg.toFixed(0) / data.num_avg.toFixed(0) : 999;

            data.isAVTAsc = data.asso_amt_avg >= data.amt_avg;
            data.isUPTAsc = data.asso_num_avg >= data.num_avg;

            data.asso_amt = '￥' + data.asso_amt.toFixed(2);
            data.asso_num = data.asso_num.toFixed(0);
            data.asso_pos_num = data.asso_pos_num.toFixed(0);
            data.asso_amt_avg = '￥' + data.asso_amt_avg.toFixed(2);
            data.asso_num_avg = data.asso_num_avg.toFixed(0);

            data.amt = '￥' + data.amt.toFixed(2);
            data.num = data.num.toFixed(0);
            data.pos_num = data.pos_num.toFixed(0);
            data.amt_avg = '￥' + data.amt_avg.toFixed(2);
            data.num_avg = data.num_avg.toFixed(0);

            data.pct = Math.abs(data.pct).toFixed(2) + '%';
            data.pcgq = Math.abs(data.pcgq).toFixed(2) + '%';

            that.chartData(data);

            var $newTd = $('<td/>').css({'border': '0', 'backgroundColor': $element.css('backgroundColor')}).attr('colSpan', $element.children().length);
            $('.additionalTR').remove();
            $element.after($('<tr/>').addClass('additionalTR').append($newTd.html($('#associationInfoDetial').html())));

            var maxRadius = $('#associationInfoDetial .associationInfoDetial_chartContainer').height(),
                radius;
            if(p_amount >= 1) {
                radius = maxRadius / p_amount;
                resetPie($('.additionalTR .js-ATV_pie_separate'), radius);
            }
            else {
                radius = maxRadius * p_amount;
                resetPie($('.additionalTR .js-ATV_pie_associated'), radius);
            }
            if(p_number >= 1) {
                radius = maxRadius / p_number;
                resetPie($('.additionalTR .js-UPT_pie_separate'), radius);
            }
            else {
                radius = maxRadius * p_number;
                resetPie($('.additionalTR .js-UPT_pie_associated'), radius);
            }
        }

        function resetPie($element, radius) {
            $element.css({ height: 0, width: 0, marginLeft: 0, marginBottom: 0, zIndex: 88 });
            $element.animate({ height: radius * 2, width: radius * 2, marginLeft: -radius, marginBottom: -radius }, 500);
        }
    };

    var vm = new ViewModel();

    ko.applyBindings(vm);

    return vm;
});
