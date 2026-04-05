from django.urls import path
from . import views

urlpatterns = [
    path('designs/', views.DesignListCreateView.as_view(), name='design-list'),
    path('designs/<str:id>/', views.DesignDetailView.as_view(), name='design-detail'),
    path('designs/<str:id>/publish/', views.publish_design, name='design-publish'),
    path('designs/<str:id>/archive/', views.archive_design, name='design-archive'),
    path('designs/<str:id>/media/', views.upload_design_media, name='design-media-upload'),
    path('designs/<str:id>/media/<str:filename>', views.DesignMediaView.as_view(), name='design-media-get'),
    
    # Public & Interactive
    path('public/designs/', views.PublicDesignListView.as_view(), name='public-design-list'),
    path('designs/<str:id>/like/', views.toggle_design_like, name='design-like-toggle'),

    # Inquiries
    path('inquiries/', views.handle_inquiries, name='inquiry-list'),
    path('inquiries/<str:id>/', views.get_inquiry_details, name='inquiry-detail'),
    path('inquiries/<str:id>/convert/', views.create_order_from_inquiry, name='inquiry-convert'),

    # Production Orders
    path('orders/fabric-purchases/', views.get_fabric_orders, name='fabric-purchases'),
    path('fabric-orders/', views.get_fabric_orders, name='fabric-orders-alias'),  # Backward compatibility
    path('orders/', views.handle_orders, name='order-list'),
    path('orders/<int:id>/', views.get_order_details, name='order-detail'),
    path('orders/<int:id>/update-quantity/', views.update_order_quantity, name='update_order_quantity'),
    path('orders/<int:id>/start/', views.start_production, name='start-production'),
    path('orders/<int:id>/complete/', views.complete_order, name='complete-order'),
    path('orders/<int:id>/ship/', views.ship_order, name='ship-order'),
    path('orders/<int:order_id>/confirm-receipt/', views.confirm_fabric_receipt, name='confirm-fabric-receipt'),

    # Local Stock
    path('atelier/stock/', views.handle_local_stock, name='atelier-stock'),
    path('atelier/stock/<int:item_id>/', views.handle_local_stock_item, name='atelier-stock-item'),
]
