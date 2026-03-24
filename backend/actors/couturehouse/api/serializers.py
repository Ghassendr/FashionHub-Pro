from rest_framework_mongoengine import serializers
from ..models import Design, DesignMedia

class DesignMediaSerializer(serializers.EmbeddedDocumentSerializer):
    class Meta:
        model = DesignMedia
        fields = ["file", "media_type", "view_angle", "is_cover", "order"]

class DesignSerializer(serializers.DocumentSerializer):
    media = DesignMediaSerializer(many=True, read_only=True)
    
    class Meta:
        model = Design
        fields = [
            "id", "fashion_house_id", "title", "description", 
            "category", "fabric_suggestions", "status", 
            "published_at", "created_at", "media"
        ]
        read_only_fields = ["status", "published_at", "created_at"]

class DesignWriteSerializer(serializers.DocumentSerializer):
    class Meta:
        model = Design
        fields = ["id", "title", "description", "category", "fabric_suggestions"]
        read_only_fields = ["id"]
